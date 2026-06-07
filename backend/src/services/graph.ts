import 'isomorphic-fetch';
import { Client } from '@microsoft/microsoft-graph-client';
import { getConfig } from '../config';
import {
  Badge,
  LeaderboardStats,
  Recognition,
  RecognitionFilters,
  RecognitionPayload,
  RecognitionStats,
  ReactionCounts,
  UserProfile
} from '../types';
import {
  aggregateReactions,
  avatarFor,
  computeLeaderboard,
  computeStats,
  emptyReactions,
  matchesFilters,
  paginate,
  sortNewestFirst
} from './aggregations';

/**
 * The six built-in badges. Used when no Badges list is configured, so the app
 * runs with only the Recognitions list. They map a recognition's Badge name to
 * its emoji / colour / template for display.
 */
const DEFAULT_BADGES: Badge[] = [
  { name: 'Teamwork', emoji: '🤝', color: '#3B82F6', description: 'Celebrate collaboration and support.', template: 'Thank you for always showing up for the team. The way you [add specific action] made a real difference...' },
  { name: 'Innovation', emoji: '💡', color: '#FBBF24', description: 'Celebrate fresh thinking and creativity.', template: 'Your creative thinking on [project] was outstanding. You brought a fresh perspective by...' },
  { name: 'Leadership', emoji: '⭐', color: '#A855F7', description: 'Recognise strong guidance.', template: 'You led by example when [situation]. Your guidance helped the team...' },
  { name: 'Goes the Extra Mile', emoji: '🎯', color: '#F97316', description: 'Celebrate dedication beyond expectations.', template: 'You went above and beyond by [action]. This level of dedication is what makes our team exceptional...' },
  { name: 'Resilience', emoji: '💪', color: '#22C55E', description: 'Celebrate perseverance under pressure.', template: 'Even under pressure you [action]. Your ability to stay focused and deliver is truly inspiring...' },
  { name: 'Excellence', emoji: '🌟', color: '#0EA5E9', description: 'Recognise high-quality execution.', template: 'The quality of your work on [project] set the bar for all of us. You consistently deliver...' }
];

const getGraphClient = (accessToken: string) =>
  Client.init({
    authProvider: (done: (err: unknown, token: string | null) => void) => {
      done(null, accessToken);
    }
  });

/**
 * Small in-memory TTL cache. SharePoint list reads are the hot path here and the
 * data set is org-sized (not internet-sized), so caching the full read for a few
 * seconds removes the N+1 badge fetch and the repeated full-list scans that the
 * stats / leaderboard / wall endpoints would otherwise trigger.
 */
class TtlCache<T> {
  private value?: { data: T; expiresAt: number };
  constructor(private readonly ttlMs: number) {}

  async get(loader: () => Promise<T>): Promise<T> {
    const now = Date.now();
    if (this.value && this.value.expiresAt > now) {
      return this.value.data;
    }
    const data = await loader();
    this.value = { data, expiresAt: now + this.ttlMs };
    return data;
  }

  invalidate(): void {
    this.value = undefined;
  }
}

const badgeCache = new TtlCache<Badge[]>(60_000);
const recognitionCache = new TtlCache<Recognition[]>(10_000);

/** Follow @odata.nextLink so we read the whole list, not just the first Graph page. */
const fetchAllItems = async (client: Client, listPath: string): Promise<any[]> => {
  const items: any[] = [];
  let response = await client.api(`${listPath}/items`).expand('fields').top(200).get();

  while (response) {
    items.push(...(response.value || []));
    const next = response['@odata.nextLink'];
    if (!next || items.length >= 5000) {
      break;
    }
    response = await client.api(next).get();
  }

  return items;
};

export const searchUsers = async (accessToken: string, query: string): Promise<UserProfile[]> => {
  const client = getGraphClient(accessToken);
  const response = await client
    .api('/users')
    .header('ConsistencyLevel', 'eventual')
    .query({
      $search: `"displayName:${query}"`,
      $select: 'id,displayName,mail,userPrincipalName,department',
      $top: 15
    })
    .get();

  return (response.value || []).map((user: any) => ({
    id: user.id,
    displayName: user.displayName,
    email: user.mail || user.userPrincipalName,
    department: user.department || 'General',
    photoUrl: avatarFor(user.displayName)
  }));
};

export const getMe = async (accessToken: string): Promise<UserProfile> => {
  const client = getGraphClient(accessToken);
  const user = await client.api('/me').select('id,displayName,mail,userPrincipalName,department').get();
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.mail || user.userPrincipalName,
    department: user.department || 'General',
    photoUrl: avatarFor(user.displayName)
  };
};

export const getBadges = async (accessToken: string): Promise<Badge[]> => {
  const { badgesListId, siteId } = getConfig();
  if (!badgesListId) {
    return DEFAULT_BADGES;
  }
  return badgeCache.get(async () => {
    const client = getGraphClient(accessToken);
    const items = await fetchAllItems(client, `/sites/${siteId}/lists/${badgesListId}`);
    return items.map((item: any) => ({
      id: item.id,
      name: item.fields?.BadgeName,
      description: item.fields?.Description,
      template: item.fields?.Template,
      emoji: item.fields?.Emoji,
      color: item.fields?.Color || '#1F4A9E'
    }));
  });
};

/** Read the Reactions list and aggregate into per-recognition counts (the source of truth). */
const getReactionsByRecognition = async (client: Client): Promise<Record<string, ReactionCounts>> => {
  const { reactionsListId, siteId } = getConfig();
  if (!reactionsListId) {
    return {};
  }
  const items = await fetchAllItems(client, `/sites/${siteId}/lists/${reactionsListId}`);
  return aggregateReactions(
    items.map((item: any) => ({ RecognitionId: item.fields?.RecognitionId, Type: item.fields?.Type }))
  );
};

const mapRecognition = (item: any, badges: Badge[], reactions: ReactionCounts): Recognition => {
  const fields = item.fields || {};
  const badgeMeta = badges.find(badge => badge.name === fields.Badge);

  return {
    id: item.id,
    senderName: fields.Sender,
    senderEmail: fields.SenderEmail,
    senderPhotoUrl: avatarFor(fields.Sender),
    receiverName: fields.Receiver,
    receiverEmail: fields.ReceiverEmail,
    receiverPhotoUrl: avatarFor(fields.Receiver),
    badge: {
      name: fields.Badge,
      emoji: badgeMeta?.emoji || '⭐',
      color: badgeMeta?.color || '#1F4A9E',
      description: badgeMeta?.description || '',
      template: badgeMeta?.template || ''
    },
    message: fields.Message,
    date: fields.Date,
    reactions,
    department: fields.Department || 'General'
  };
};

/**
 * Read the full recognition feed once, merge in live reaction counts, sort newest
 * first, and cache briefly. Filtering and pagination are then applied in memory so
 * they are correct and consistent (the previous implementation paged at the Graph
 * layer and filtered afterwards, which silently dropped and reordered results).
 */
const getAllRecognitions = async (accessToken: string): Promise<Recognition[]> => {
  return recognitionCache.get(async () => {
    const { recognitionsListId, siteId } = getConfig();
    const client = getGraphClient(accessToken);
    const [items, badges, reactionsMap] = await Promise.all([
      fetchAllItems(client, `/sites/${siteId}/lists/${recognitionsListId}`),
      getBadges(accessToken),
      getReactionsByRecognition(client)
    ]);

    return sortNewestFirst(
      items.map(item => mapRecognition(item, badges, reactionsMap[item.id] || emptyReactions()))
    );
  });
};

export const getRecognitions = async (
  accessToken: string,
  options: RecognitionFilters & { skip?: number; top?: number }
): Promise<Recognition[]> => {
  const all = await getAllRecognitions(accessToken);
  const filtered = all.filter(item => matchesFilters(item, options));
  return paginate(filtered, options.skip, options.top);
};

export const createRecognition = async (
  accessToken: string,
  payload: RecognitionPayload,
  sender: UserProfile
): Promise<Recognition> => {
  const { recognitionsListId, siteId } = getConfig();
  const client = getGraphClient(accessToken);
  const response = await client.api(`/sites/${siteId}/lists/${recognitionsListId}/items`).post({
    fields: {
      Sender: sender.displayName,
      SenderEmail: sender.email,
      Receiver: payload.receiverName,
      ReceiverEmail: payload.receiverEmail,
      Badge: payload.badgeName,
      Message: payload.message,
      Date: new Date().toISOString(),
      Department: payload.department || sender.department || 'General'
    }
  });

  recognitionCache.invalidate();
  const badges = await getBadges(accessToken);
  return mapRecognition(response, badges, emptyReactions());
};

export const addReaction = async (
  accessToken: string,
  recognitionId: string,
  reactionType: keyof ReactionCounts,
  userId: string
): Promise<void> => {
  const { reactionsListId, siteId } = getConfig();
  if (!reactionsListId) {
    // No Reactions list configured — reactions are disabled, so this is a no-op.
    return;
  }
  const client = getGraphClient(accessToken);

  // Best-effort dedupe: one reaction of each type per user per recognition.
  const existing = await fetchAllItems(client, `/sites/${siteId}/lists/${reactionsListId}`);
  const alreadyReacted = existing.some(
    item =>
      item.fields?.RecognitionId === recognitionId &&
      item.fields?.UserId === userId &&
      item.fields?.Type === reactionType
  );
  if (alreadyReacted) {
    return;
  }

  await client.api(`/sites/${siteId}/lists/${reactionsListId}/items`).post({
    fields: {
      RecognitionId: recognitionId,
      UserId: userId,
      Type: reactionType
    }
  });

  recognitionCache.invalidate();
};

export const getStats = async (accessToken: string): Promise<RecognitionStats> => {
  return computeStats(await getAllRecognitions(accessToken));
};

export const getLeaderboard = async (accessToken: string): Promise<LeaderboardStats> => {
  return computeLeaderboard(await getAllRecognitions(accessToken));
};
