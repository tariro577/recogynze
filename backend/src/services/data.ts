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

/** The organisation's Five Practices of Exemplary Leadership (name -> emoji / colour / template). */
export const DEFAULT_BADGES: Badge[] = [
  { name: 'Challenging the Process', emoji: '🚀', color: '#F97316', description: 'Seeking new ways to improve and taking smart risks.', template: 'Thank you for challenging the status quo when [situation]. Your willingness to try a new approach made a real difference...' },
  { name: 'Enabling Others to Act', emoji: '🤝', color: '#3B82F6', description: 'Building trust and empowering the team.', template: 'You empowered the team by [action]. The way you built trust and brought people together...' },
  { name: 'Encouraging the Heart', emoji: '❤️', color: '#EF4444', description: 'Uplifting, appreciating and celebrating others.', template: 'You lifted the team when [situation]. Your appreciation and support meant so much...' },
  { name: 'Inspiring a Shared Vision', emoji: '🔭', color: '#A855F7', description: 'Painting a compelling picture of the future.', template: 'You inspired us with your vision for [project/goal]. The way you helped everyone see what is possible...' },
  { name: 'Modelling the Way', emoji: '🧭', color: '#14B8A6', description: 'Leading by example and setting the standard.', template: 'You led by example when [situation]. Your standards and integrity set the bar for all of us...' }
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
