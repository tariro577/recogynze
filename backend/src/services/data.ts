import {
  Badge,
  LeaderboardStats,
  Recognition,
  RecognitionComment,
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
import { getStore, NewComment, NewRecognition, StoredComment, StoredRecognition } from '../store';

/** The organisation's Five Practices of Exemplary Leadership (name -> emoji / colour / template). */
export const DEFAULT_BADGES: Badge[] = [
  { name: 'Challenging the Process', emoji: '🚀', color: '#F97316', description: 'Seeking new ways to improve and taking smart risks.', template: 'Thank you for challenging the process. You questioned how things are done and tried a better way when [describe the situation]. Your courage to experiment made a real impact.' },
  { name: 'Enabling Others to Act', emoji: '🤝', color: '#3B82F6', description: 'Building trust and empowering the team.', template: 'Thank you for enabling others to act. You built trust and gave the team what we needed to succeed when [describe the situation]. Because of you, we delivered together.' },
  { name: 'Encouraging the Heart', emoji: '❤️', color: '#EF4444', description: 'Uplifting, appreciating and celebrating others.', template: 'Thank you for encouraging the heart. You noticed the effort and lifted everyone’s spirits when [describe the situation]. Your care and appreciation made a real difference to the team.' },
  { name: 'Inspiring a Shared Vision', emoji: '🔭', color: '#A855F7', description: 'Painting a compelling picture of the future.', template: 'Thank you for inspiring a shared vision. You helped us see what is possible and brought us together around a common goal when [describe the situation]. Your vision moved us forward.' },
  { name: 'Modelling the Way', emoji: '🧭', color: '#14B8A6', description: 'Leading by example and setting the standard.', template: 'Thank you for modelling the way. You led by example and set the standard through your actions when [describe the situation]. You showed us what great looks like.' }
];

const toRecognition = (s: StoredRecognition, commentCount = 0): Recognition => {
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
    department: s.department,
    commentCount
  };
};

const toComment = (c: StoredComment): RecognitionComment => ({
  id: c.id,
  recognitionId: c.recognitionId,
  authorName: c.authorName,
  authorEmail: c.authorEmail,
  authorPhotoUrl: avatarFor(c.authorName),
  message: c.message,
  date: c.date
});

const loadAll = async (): Promise<Recognition[]> => {
  const store = await getStore();
  const [stored, commentCounts] = await Promise.all([
    store.listRecognitions(),
    store.countComments()
  ]);
  return sortNewestFirst(stored.map(s => toRecognition(s, commentCounts[s.id] || 0)));
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

export const getComments = async (recognitionId: string): Promise<RecognitionComment[]> => {
  const store = await getStore();
  return (await store.listComments(recognitionId)).map(toComment);
};

/** Returns null when the recognition doesn't exist. */
export const addComment = async (input: NewComment): Promise<RecognitionComment | null> => {
  const store = await getStore();
  const created = await store.addComment(input);
  return created ? toComment(created) : null;
};

export const getStats = async (): Promise<RecognitionStats> => computeStats(await loadAll());

export const getLeaderboard = async (): Promise<LeaderboardStats> => {
  const store = await getStore();
  const [all, employees] = await Promise.all([loadAll(), store.listEmployees()]);
  return computeLeaderboard(all, Date.now(), employees);
};

/** Distinct departments from the employee directory — the directory is the
 *  single source of truth, so renamed/retired departments on old recognitions
 *  don't linger in the filter dropdown. */
export const listDepartments = async (): Promise<string[]> => {
  const store = await getStore();
  const employees = await store.listEmployees();
  const departments = new Set<string>();
  employees.forEach(e => e.department && departments.add(e.department));
  return [...departments].sort((a, b) => a.localeCompare(b));
};

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
