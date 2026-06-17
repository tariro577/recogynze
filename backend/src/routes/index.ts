import { Router, Request, Response, NextFunction } from 'express';
import {
  addComment,
  addReaction,
  clearRecognitions,
  createRecognition,
  getBadges,
  getComments,
  getLeaderboard,
  getRecognitions,
  getStats,
  listDepartments,
  listEmployees,
  searchUsers,
  setEmployees
} from '../services/data';
import { containsAppearanceComment } from '../utils/moderation';
import { askAssistant, AssistantTurn, isAssistantEnabled, moderateWithAi } from '../services/ai';
import { notifyTeams } from '../services/notify';
import { ReactionType, UserProfile } from '../types';

const router = Router();

/** Wrap async handlers so rejected promises reach the error middleware instead of hanging. */
const handle =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

const VALID_REACTIONS: ReactionType[] = ['clap', 'trophy', 'heart'];

/**
 * Identity comes from the Teams client (getContext) and is sent by the frontend.
 * This is a low-stakes internal recognition wall, so we trust the client-asserted
 * identity rather than requiring Azure AD / admin consent. Header first, body fallback.
 */
const callerEmail = (req: Request): string =>
  String(req.header('x-user-email') || req.body?.senderEmail || '').trim();

/** Display names travel URI-encoded (HTTP headers are ISO-8859-1 only). */
const decodeHeader = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const MAX_RECOGNITION_LENGTH = 420;

router.get(
  '/recognitions',
  handle(async (req, res) => {
    const { skip, top, badge, department, timeRange, search } = req.query;
    const recognitions = await getRecognitions({
      skip: Number(skip || 0),
      top: Number(top || 20),
      badge: badge ? String(badge) : undefined,
      department: department ? String(department) : undefined,
      timeRange: timeRange ? String(timeRange) : undefined,
      search: search ? String(search) : undefined
    });
    res.status(200).json(recognitions);
  })
);

router.post(
  '/recognitions',
  handle(async (req, res) => {
    const body = req.body || {};
    if (!body.senderEmail || !body.senderName) {
      res.status(400).json({ message: 'Sender identity is missing.' });
      return;
    }
    if (!body.receiverEmail || !body.badgeName || !body.message) {
      res.status(400).json({ message: 'receiverEmail, badgeName and message are required.' });
      return;
    }
    if (String(body.message).length > MAX_RECOGNITION_LENGTH) {
      res.status(400).json({
        message: `Recognition messages are limited to ${MAX_RECOGNITION_LENGTH} characters.`
      });
      return;
    }
    if (containsAppearanceComment(body.message)) {
      res.status(400).json({
        message:
          'Recognition should celebrate professional contributions, not appearance. Please focus on their work and impact!'
      });
      return;
    }
    // Second line of defence: the AI gateway screens for appearance comments,
    // out-of-scope content and anything inappropriate. Fails open if unreachable.
    const verdict = await moderateWithAi(String(body.message), 'recognition');
    if (!verdict.allowed) {
      res.status(400).json({
        message:
          verdict.reason ||
          'Recognition should celebrate professional contributions. Please focus on their work and impact!'
      });
      return;
    }

    const input = {
      senderName: body.senderName,
      senderEmail: body.senderEmail,
      receiverName: body.receiverName,
      receiverEmail: body.receiverEmail,
      badgeName: body.badgeName,
      message: body.message,
      department: body.department || 'General'
    };
    const created = await createRecognition(input);
    notifyTeams(input).catch(() => undefined);
    res.status(201).json(created);
  })
);

router.post(
  '/recognitions/:id/reactions',
  handle(async (req, res) => {
    const { id } = req.params;
    const type = req.body?.type as ReactionType;
    if (!VALID_REACTIONS.includes(type)) {
      res.status(400).json({ message: `Reaction type must be one of: ${VALID_REACTIONS.join(', ')}` });
      return;
    }
    const email = callerEmail(req) || 'anonymous';
    await addReaction(id, type, email);
    res.status(204).send();
  })
);

const MAX_COMMENT_LENGTH = 500;

router.get(
  '/recognitions/:id/comments',
  handle(async (req, res) => {
    res.status(200).json(await getComments(req.params.id));
  })
);

router.post(
  '/recognitions/:id/comments',
  handle(async (req, res) => {
    const authorEmail = callerEmail(req);
    const authorName = decodeHeader(
      String(req.header('x-user-name') || req.body?.authorName || '')
    ).trim();
    if (!authorEmail || !authorName) {
      res.status(400).json({ message: 'Commenter identity is missing.' });
      return;
    }
    const message = String(req.body?.message || '').trim();
    if (!message) {
      res.status(400).json({ message: 'Comment message is required.' });
      return;
    }
    if (message.length > MAX_COMMENT_LENGTH) {
      res.status(400).json({ message: `Comments are limited to ${MAX_COMMENT_LENGTH} characters.` });
      return;
    }
    if (containsAppearanceComment(message)) {
      res.status(400).json({
        message: 'Comments should stay professional. Please focus on their work and impact!'
      });
      return;
    }
    const verdict = await moderateWithAi(message, 'comment');
    if (!verdict.allowed) {
      res.status(400).json({
        message: verdict.reason || 'Comments should stay professional and appropriate.'
      });
      return;
    }
    const created = await addComment({
      recognitionId: req.params.id,
      authorName,
      authorEmail,
      message
    });
    if (!created) {
      res.status(404).json({ message: 'Recognition not found.' });
      return;
    }
    res.status(201).json(created);
  })
);

router.get(
  '/departments',
  handle(async (_req, res) => {
    res.status(200).json(await listDepartments());
  })
);

// ---- AI assistant ----
// Small in-app helper ("how do I give a recognition?"). History comes from the
// client; identity isn't needed. Disabled (503) when no AI gateway is configured.
router.post(
  '/assistant',
  handle(async (req, res) => {
    if (!isAssistantEnabled()) {
      res.status(503).json({
        message: 'The assistant is not available right now. Please ask your administrator to configure the AI gateway.'
      });
      return;
    }
    const input = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const messages: AssistantTurn[] = input
      .filter(
        (m: any) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim()
      )
      .map((m: any) => ({ role: m.role, content: String(m.content).trim() }));
    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      res.status(400).json({ message: 'Provide messages ending with a user question.' });
      return;
    }
    try {
      const reply = await askAssistant(messages);
      res.status(200).json({ reply });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[recognyze] assistant request failed:', (err as Error).message);
      res.status(502).json({
        message: 'The assistant could not be reached. Please try again in a moment.'
      });
    }
  })
);

router.get(
  '/badges',
  handle(async (_req, res) => {
    res.status(200).json(await getBadges());
  })
);

router.get(
  '/stats',
  handle(async (_req, res) => {
    res.status(200).json(await getStats());
  })
);

router.get(
  '/leaderboard',
  handle(async (_req, res) => {
    res.status(200).json(await getLeaderboard());
  })
);

router.get(
  '/users/search',
  handle(async (req, res) => {
    const query = String(req.query.query || '').trim();
    res.status(200).json(query ? await searchUsers(query) : await listEmployees());
  })
);

// ---- Admin (token-guarded) ----
// Enabled only when ADMIN_TOKEN is set. Lets an operator manage the employee
// directory and clear test data without any direct database access.
const adminGuard = (req: Request, res: Response, next: NextFunction) => {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return res.status(404).json({ message: 'Not found' });
  }
  if (req.header('x-admin-token') !== token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  return next();
};

router.post(
  '/admin/reset',
  adminGuard,
  handle(async (_req, res) => {
    await clearRecognitions();
    res.status(200).json({ ok: true, message: 'All recognitions and reactions cleared.' });
  })
);

router.post(
  '/admin/employees',
  adminGuard,
  handle(async (req, res) => {
    const input = Array.isArray(req.body?.employees) ? req.body.employees : [];
    const employees: UserProfile[] = input
      .filter((e: any) => e?.email && e?.name)
      .map((e: any) => ({
        id: String(e.email),
        displayName: String(e.name),
        email: String(e.email),
        department: e.department ? String(e.department) : 'General'
      }));
    if (!employees.length) {
      res.status(400).json({ message: 'Provide employees: [{ name, email, department? }]' });
      return;
    }
    await setEmployees(employees);
    res.status(200).json({ ok: true, count: employees.length });
  })
);

export default router;
