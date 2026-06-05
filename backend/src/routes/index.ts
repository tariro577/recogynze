import { Router, Response, NextFunction } from 'express';
import {
  addReaction,
  createRecognition,
  getBadges,
  getLeaderboard,
  getMe,
  getRecognitions,
  getStats,
  searchUsers
} from '../services/graph';
import { containsAppearanceComment } from '../utils/moderation';
import { ReactionType } from '../types';
import { authenticate, AuthenticatedRequest } from '../auth';

const router = Router();

/** Wrap async handlers so rejected promises reach the error middleware instead of hanging. */
const handle =
  (fn: (req: AuthenticatedRequest, res: Response) => Promise<unknown>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

const VALID_REACTIONS: ReactionType[] = ['clap', 'trophy', 'heart'];

router.use(authenticate);

router.get(
  '/recognitions',
  handle(async (req, res) => {
    const { skip, top, badge, department, timeRange, search } = req.query;
    const recognitions = await getRecognitions(req.accessToken!, {
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
    const payload = req.body;
    if (!payload?.receiverEmail || !payload?.badgeName || !payload?.message) {
      res.status(400).json({ message: 'receiverEmail, badgeName and message are required.' });
      return;
    }
    if (containsAppearanceComment(payload.message)) {
      res.status(400).json({
        message:
          'Recognition should celebrate professional contributions, not appearance. Please focus on their work and impact!'
      });
      return;
    }

    const sender = await getMe(req.accessToken!);
    const newRecognition = await createRecognition(req.accessToken!, payload, sender);
    res.status(201).json(newRecognition);
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
    const user = await getMe(req.accessToken!);
    await addReaction(req.accessToken!, id, type, user.id);
    res.status(204).send();
  })
);

router.get(
  '/badges',
  handle(async (req, res) => {
    res.status(200).json(await getBadges(req.accessToken!));
  })
);

router.get(
  '/stats',
  handle(async (req, res) => {
    res.status(200).json(await getStats(req.accessToken!));
  })
);

router.get(
  '/leaderboard',
  handle(async (req, res) => {
    res.status(200).json(await getLeaderboard(req.accessToken!));
  })
);

router.get(
  '/users/search',
  handle(async (req, res) => {
    const query = String(req.query.query || '').trim();
    if (!query) {
      res.status(200).json([]);
      return;
    }
    res.status(200).json(await searchUsers(req.accessToken!, query));
  })
);

router.get(
  '/me',
  handle(async (req, res) => {
    res.status(200).json(await getMe(req.accessToken!));
  })
);

export default router;
