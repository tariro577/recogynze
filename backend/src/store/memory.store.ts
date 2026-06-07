import { ReactionType, UserProfile } from '../types';
import { NewRecognition, StoredRecognition, Store } from './types';
import { SEED_EMPLOYEES, SEED_RECOGNITIONS } from './seed';

/**
 * In-memory store. Zero setup — perfect for local dev and the Teams preview. Data
 * is seeded with samples and does NOT persist across restarts (and on serverless,
 * not reliably across requests). Use the Postgres store for durable data.
 */
export class MemoryStore implements Store {
  private recognitions: StoredRecognition[] = [];
  private employees: UserProfile[] = [];
  private reactionKeys = new Set<string>();
  private counter = 1000;

  async init(): Promise<void> {
    this.employees = [...SEED_EMPLOYEES];
    this.recognitions = SEED_RECOGNITIONS.map(r => ({ ...r, reactions: { ...r.reactions } }));
  }

  async listRecognitions(): Promise<StoredRecognition[]> {
    return this.recognitions.map(r => ({ ...r, reactions: { ...r.reactions } }));
  }

  async createRecognition(input: NewRecognition): Promise<StoredRecognition> {
    const record: StoredRecognition = {
      id: `mem-${this.counter++}`,
      ...input,
      reactions: { clap: 0, trophy: 0, heart: 0 },
      date: new Date().toISOString()
    };
    this.recognitions.unshift(record);
    return { ...record, reactions: { ...record.reactions } };
  }

  async addReaction(recognitionId: string, userEmail: string, type: ReactionType): Promise<void> {
    const key = `${recognitionId}:${userEmail}:${type}`;
    if (this.reactionKeys.has(key)) {
      return;
    }
    const recognition = this.recognitions.find(r => r.id === recognitionId);
    if (!recognition) {
      return;
    }
    this.reactionKeys.add(key);
    recognition.reactions[type] = (recognition.reactions[type] || 0) + 1;
  }

  async listEmployees(): Promise<UserProfile[]> {
    return [...this.employees];
  }

  async searchEmployees(query: string): Promise<UserProfile[]> {
    const q = query.toLowerCase();
    return this.employees
      .filter(e => e.displayName.toLowerCase().includes(q) || e.email.toLowerCase().includes(q))
      .slice(0, 15);
  }
}
