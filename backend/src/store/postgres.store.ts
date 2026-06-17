import { sql } from '@vercel/postgres';
import { ReactionType, UserProfile } from '../types';
import { aggregateReactions, emptyReactions } from '../services/aggregations';
import { NewComment, NewRecognition, StoredComment, StoredRecognition, Store } from './types';
import { SEED_EMPLOYEES } from './seed';

/**
 * Durable store backed by Vercel Postgres (Neon). Activated automatically when a
 * POSTGRES_URL connection string is present in the environment.
 */
export class PostgresStore implements Store {
  async init(): Promise<void> {
    await sql`
      CREATE TABLE IF NOT EXISTS recognitions (
        id            BIGSERIAL PRIMARY KEY,
        sender_name   TEXT NOT NULL,
        sender_email  TEXT NOT NULL,
        receiver_name TEXT NOT NULL,
        receiver_email TEXT NOT NULL,
        badge_name    TEXT NOT NULL,
        message       TEXT NOT NULL,
        department    TEXT NOT NULL DEFAULT 'General',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS reactions (
        id              BIGSERIAL PRIMARY KEY,
        recognition_id  TEXT NOT NULL,
        user_email      TEXT NOT NULL,
        type            TEXT NOT NULL,
        UNIQUE (recognition_id, user_email, type)
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS employees (
        email      TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        department TEXT NOT NULL DEFAULT 'General'
      )`;
    await sql`
      CREATE TABLE IF NOT EXISTS comments (
        id              BIGSERIAL PRIMARY KEY,
        recognition_id  TEXT NOT NULL,
        author_name     TEXT NOT NULL,
        author_email    TEXT NOT NULL,
        message         TEXT NOT NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    await sql`
      CREATE INDEX IF NOT EXISTS comments_recognition_id_idx ON comments (recognition_id)`;
    // Lookups compare against the textual form of the bigserial id.
    await sql`
      CREATE INDEX IF NOT EXISTS recognitions_id_text_idx ON recognitions ((id::text))`;

    // Sync the canonical employee list on every deploy so edits to seed.ts
    // take effect after a redeploy without needing a manual DB change.
    for (const e of SEED_EMPLOYEES) {
      await sql`
        INSERT INTO employees (email, name, department)
        VALUES (${e.email}, ${e.displayName}, ${e.department})
        ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, department = EXCLUDED.department`;
    }
  }

  async listRecognitions(): Promise<StoredRecognition[]> {
    const [recognitions, reactions] = await Promise.all([
      sql`SELECT id, sender_name, sender_email, receiver_name, receiver_email,
                 badge_name, message, department, created_at
          FROM recognitions ORDER BY created_at DESC`,
      sql`SELECT recognition_id, type FROM reactions`
    ]);

    const reactionMap = aggregateReactions(
      reactions.rows.map(r => ({ RecognitionId: String(r.recognition_id), Type: String(r.type) }))
    );

    return recognitions.rows.map(row => ({
      id: String(row.id),
      senderName: row.sender_name,
      senderEmail: row.sender_email,
      receiverName: row.receiver_name,
      receiverEmail: row.receiver_email,
      badgeName: row.badge_name,
      message: row.message,
      department: row.department,
      reactions: reactionMap[String(row.id)] || emptyReactions(),
      date: new Date(row.created_at).toISOString()
    }));
  }

  async createRecognition(input: NewRecognition): Promise<StoredRecognition> {
    const { rows } = await sql`
      INSERT INTO recognitions
        (sender_name, sender_email, receiver_name, receiver_email, badge_name, message, department)
      VALUES
        (${input.senderName}, ${input.senderEmail}, ${input.receiverName}, ${input.receiverEmail},
         ${input.badgeName}, ${input.message}, ${input.department})
      RETURNING id, created_at`;

    return {
      id: String(rows[0].id),
      ...input,
      reactions: emptyReactions(),
      date: new Date(rows[0].created_at).toISOString()
    };
  }

  async addReaction(recognitionId: string, userEmail: string, type: ReactionType): Promise<void> {
    // Match the memory store: ignore reactions to recognitions that don't
    // exist (stale ids from another store mode or after an admin reset),
    // instead of persisting orphan rows.
    const exists = await sql`
      SELECT 1 FROM recognitions WHERE id::text = ${recognitionId} LIMIT 1`;
    if (!exists.rows.length) {
      return;
    }
    await sql`
      INSERT INTO reactions (recognition_id, user_email, type)
      VALUES (${recognitionId}, ${userEmail}, ${type})
      ON CONFLICT (recognition_id, user_email, type) DO NOTHING`;
  }

  async listComments(recognitionId: string): Promise<StoredComment[]> {
    const { rows } = await sql`
      SELECT id, recognition_id, author_name, author_email, message, created_at
      FROM comments
      WHERE recognition_id = ${recognitionId}
      ORDER BY created_at ASC`;
    return rows.map(row => ({
      id: String(row.id),
      recognitionId: String(row.recognition_id),
      authorName: row.author_name,
      authorEmail: row.author_email,
      message: row.message,
      date: new Date(row.created_at).toISOString()
    }));
  }

  async addComment(input: NewComment): Promise<StoredComment | null> {
    const exists = await sql`
      SELECT 1 FROM recognitions WHERE id::text = ${input.recognitionId} LIMIT 1`;
    if (!exists.rows.length) {
      return null;
    }
    const { rows } = await sql`
      INSERT INTO comments (recognition_id, author_name, author_email, message)
      VALUES (${input.recognitionId}, ${input.authorName}, ${input.authorEmail}, ${input.message})
      RETURNING id, created_at`;
    return {
      id: String(rows[0].id),
      ...input,
      date: new Date(rows[0].created_at).toISOString()
    };
  }

  async countComments(): Promise<Record<string, number>> {
    const { rows } = await sql`
      SELECT recognition_id, COUNT(*)::int AS count FROM comments GROUP BY recognition_id`;
    const counts: Record<string, number> = {};
    rows.forEach(row => {
      counts[String(row.recognition_id)] = Number(row.count);
    });
    return counts;
  }

  async listEmployees(): Promise<UserProfile[]> {
    const { rows } = await sql`SELECT email, name, department FROM employees ORDER BY name`;
    return rows.map(this.toProfile);
  }

  async searchEmployees(query: string): Promise<UserProfile[]> {
    const like = `%${query}%`;
    const { rows } = await sql`
      SELECT email, name, department FROM employees
      WHERE name ILIKE ${like} OR email ILIKE ${like}
      ORDER BY name LIMIT 15`;
    return rows.map(this.toProfile);
  }

  async setEmployees(employees: UserProfile[]): Promise<void> {
    await sql`TRUNCATE employees`;
    for (const e of employees) {
      await sql`
        INSERT INTO employees (email, name, department)
        VALUES (${e.email}, ${e.displayName}, ${e.department || 'General'})
        ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, department = EXCLUDED.department`;
    }
  }

  async clearRecognitions(): Promise<void> {
    // No RESTART IDENTITY: reusing bigserial ids would let stale reaction /
    // comment rows (or clients holding old ids) attach to new recognitions.
    await sql`TRUNCATE recognitions, reactions, comments`;
  }

  private toProfile = (row: any): UserProfile => ({
    id: row.email,
    displayName: row.name,
    email: row.email,
    department: row.department
  });
}
