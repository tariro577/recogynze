import { Router, Request, Response, NextFunction } from 'express';
import {
  addReaction,
  createRecognition,
  getBadges,
  getLeaderboard,
  getRecognitions,
  getStats,
  listEmployees,
  searchUsers
} from '../services/data';
import { containsAppearanceComment } from '../utils/moderation';
import { ReactionType } from '../types';

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

export default router;
