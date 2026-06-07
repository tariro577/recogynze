import { Router, Request, Response, NextFunction } from 'express';
import {
  addReaction,
  clearRecognitions,
  createRecognition,
  getBadges,
  getLeaderboard,
  getRecognitions,
  getStats,
  listEmployees,
  searchUsers,
  setEmployees
} from '../services/data';
import { containsAppearanceComment } from '../utils/moderation';
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
    if (containsAppearanceComment(body.message)) {
      res.status(400).json({
        message:
          'Recognition should celebrate professional contributions, not appearance. Please focus on their work and impact!'
      });
      return;
    }

    const created = await createRecognition({
      senderName: body.senderName,
      senderEmail: body.senderEmail,
      receiverName: body.receiverName,
      receiverEmail: body.receiverEmail,
      badgeName: body.badgeName,
      message: body.message,
      department: body.department || 'General'
    });
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
