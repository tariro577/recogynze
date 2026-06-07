import {
  Badge,
  LeaderboardStats,
  Recognition,
  RecognitionFilters,
  RecognitionStats,
  ReactionType,
  UserProfile
} from '../types';
import {
  avatarFor,
  computeLeaderboard,
  computeStats,
  matchesFilters,
  paginate,
  sortNewestFirst
} from './aggregations';
import { getStore, NewRecognition, StoredRecognition } from '../store';

/** The six built-in badges (name -> emoji / colour / template for display). */
export const DEFAULT_BADGES: Badge[] = [
  { name: 'Teamwork', emoji: '🤝', color: '#3B82F6', description: 'Celebrate collaboration and support.', template: 'Thank you for always showing up for the team. The way you [add specific action] made a real difference...' },
  { name: 'Innovation', emoji: '💡', color: '#FBBF24', description: 'Celebrate fresh thinking and creativity.', template: 'Your creative thinking on [project] was outstanding. You brought a fresh perspective by...' },
  { name: 'Leadership', emoji: '⭐', color: '#A855F7', description: 'Recognise strong guidance.', template: 'You led by example when [situation]. Your guidance helped the team...' },
  { name: 'Goes the Extra Mile', emoji: '🎯', color: '#F97316', description: 'Celebrate dedication beyond expectations.', template: 'You went above and beyond by [action]. This level of dedication is what makes our team exceptional...' },
  { name: 'Resilience', emoji: '💪', color: '#22C55E', description: 'Celebrate perseverance under pressure.', template: 'Even under pressure you [action]. Your ability to stay focused and deliver is truly inspiring...' },
  { name: 'Excellence', emoji: '🌟', color: '#0EA5E9', description: 'Recognise high-quality execution.', template: 'The quality of your work on [project] set the bar for all of us. You consistently deliver...' }
];

const toRecognition = (s: StoredRecognition): Recognition => {
  const badgeMeta = DEFAULT_BADGES.find(b => b.name === s.badgeName);
  return {
    id: s.id,
    senderName: s.senderName,
    senderEmail: s.senderEmail,
    senderPhotoUrl: avatarFor(s.senderName),
    receiverName: s.receiverName,
    receiverEmail: s.receiverEmail,
    receiverPhotoUrl: avatarFor(s.receiverName),
    badge: {
      name: s.badgeName,
      emoji: badgeMeta?.emoji || '⭐',
      color: badgeMeta?.color || '#1F4A9E',
      description: badgeMeta?.description || '',
      template: badgeMeta?.template || ''
    },
    message: s.message,
    date: s.date,
    reactions: s.reactions,
    department: s.department
  };
};

const loadAll = async (): Promise<Recognition[]> => {
  const store = await getStore();
  const stored = await store.listRecognitions();
  return sortNewestFirst(stored.map(toRecognition));
};

export const getBadges = async (): Promise<Badge[]> => DEFAULT_BADGES;

export const getRecognitions = async (
  options: RecognitionFilters & { skip?: number; top?: number }
): Promise<Recognition[]> => {
  const all = await loadAll();
  const filtered = all.filter(item => matchesFilters(item, options));
  return paginate(filtered, options.skip, options.top);
};

export const createRecognition = async (input: NewRecognition): Promise<Recognition> => {
  const store = await getStore();
  const created = await store.createRecognition(input);
  return toRecognition(created);
};

export const addReaction = async (
  recognitionId: string,
  type: ReactionType,
  userEmail: string
): Promise<void> => {
  const store = await getStore();
  await store.addReaction(recognitionId, userEmail, type);
};

export const getStats = async (): Promise<RecognitionStats> => computeStats(await loadAll());

export const getLeaderboard = async (): Promise<LeaderboardStats> => computeLeaderboard(await loadAll());

const withAvatar = (user: UserProfile): UserProfile => ({
  ...user,
  photoUrl: user.photoUrl || avatarFor(user.displayName)
});

export const searchUsers = async (query: string): Promise<UserProfile[]> => {
  const store = await getStore();
  return (await store.searchEmployees(query)).map(withAvatar);
};

export const listEmployees = async (): Promise<UserProfile[]> => {
  const store = await getStore();
  return (await store.listEmployees()).map(withAvatar);
};

export const setEmployees = async (employees: UserProfile[]): Promise<void> => {
  const store = await getStore();
  await store.setEmployees(employees);
};

export const clearRecognitions = async (): Promise<void> => {
  const store = await getStore();
  await store.clearRecognitions();
};
