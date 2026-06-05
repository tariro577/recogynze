import {
  LeaderboardEntry,
  LeaderboardStats,
  ReactionCounts,
  Recognition,
  RecognitionFilters,
  RecognitionStats
} from '../types';

export const emptyReactions = (): ReactionCounts => ({ clap: 0, trophy: 0, heart: 0 });

export const avatarFor = (name: string): string =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=1F4A9E&color=fff`;

/** Aggregate raw Reactions-list rows into per-recognition counts. */
export const aggregateReactions = (
  rows: Array<{ RecognitionId?: string; Type?: string }>
): Record<string, ReactionCounts> => {
  const map: Record<string, ReactionCounts> = {};
  rows.forEach(row => {
    const recognitionId = row.RecognitionId;
    const type = row.Type as keyof ReactionCounts;
    if (!recognitionId || !type) {
      return;
    }
    map[recognitionId] = map[recognitionId] || emptyReactions();
    if (type in map[recognitionId]) {
      map[recognitionId][type] += 1;
    }
  });
  return map;
};

export const isWithinRange = (date: string, range?: string, now: number = Date.now()): boolean => {
  if (!range || range === 'all') {
    return true;
  }
  const target = new Date(date).getTime();
  if (Number.isNaN(target)) {
    return false;
  }
  const day = 24 * 60 * 60 * 1000;
  if (range === 'week') {
    return target >= now - 7 * day;
  }
  if (range === 'month') {
    return target >= now - 30 * day;
  }
  return true;
};

export const matchesFilters = (
  item: Recognition,
  filters: RecognitionFilters,
  now: number = Date.now()
): boolean => {
  const badge = filters.badge?.toLowerCase();
  const department = filters.department?.toLowerCase();
  const search = filters.search?.toLowerCase();

  const matchesBadge = badge ? (item.badge.name || '').toLowerCase().includes(badge) : true;
  const matchesDepartment = department
    ? (item.department || '').toLowerCase().includes(department)
    : true;
  // Search matches names AND emails so the profile tab (which queries by email) works.
  const matchesSearch = search
    ? [item.senderName, item.receiverName, item.senderEmail, item.receiverEmail].some(field =>
        (field || '').toLowerCase().includes(search)
      )
    : true;

  return matchesBadge && matchesDepartment && matchesSearch && isWithinRange(item.date, filters.timeRange, now);
};

export const sortNewestFirst = (items: Recognition[]): Recognition[] =>
  [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export const paginate = <T>(items: T[], skip = 0, top = 20): T[] => {
  const safeSkip = Math.max(0, Number(skip) || 0);
  const safeTop = Math.max(1, Number(top) || 20);
  return items.slice(safeSkip, safeSkip + safeTop);
};

export const computeStats = (
  all: Recognition[],
  now: number = Date.now()
): RecognitionStats => {
  const badgeThisWeek: Record<string, number> = {};
  const recipientThisMonth: Record<string, number> = {};

  all.forEach(item => {
    if (isWithinRange(item.date, 'week', now) && item.badge.name) {
      badgeThisWeek[item.badge.name] = (badgeThisWeek[item.badge.name] || 0) + 1;
    }
    if (isWithinRange(item.date, 'month', now) && item.receiverName) {
      recipientThisMonth[item.receiverName] = (recipientThisMonth[item.receiverName] || 0) + 1;
    }
  });

  const top = (record: Record<string, number>): string =>
    Object.entries(record).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  return {
    totalRecognitions: all.length,
    mostUsedBadge: top(badgeThisWeek),
    mostRecognisedEmployee: top(recipientThisMonth)
  };
};

export const computeLeaderboard = (
  all: Recognition[],
  now: number = Date.now()
): LeaderboardStats => {
  const weekly = all.filter(item => isWithinRange(item.date, 'week', now));

  const bySender: Record<string, LeaderboardEntry> = {};
  const byReceiver: Record<string, LeaderboardEntry> = {};
  const deptStats: Record<string, { sent: number; received: number }> = {};

  const ensure = (
    bucket: Record<string, LeaderboardEntry>,
    email: string,
    name: string,
    department: string
  ): LeaderboardEntry => {
    bucket[email] = bucket[email] || {
      name,
      department: department || 'General',
      recognitionsGiven: 0,
      recognitionsReceived: 0,
      badgeBreakdown: {},
      photoUrl: avatarFor(name)
    };
    return bucket[email];
  };

  weekly.forEach(recognition => {
    ensure(
      bySender,
      recognition.senderEmail,
      recognition.senderName,
      recognition.department || 'General'
    ).recognitionsGiven += 1;

    const receiver = ensure(
      byReceiver,
      recognition.receiverEmail,
      recognition.receiverName,
      recognition.department || 'General'
    );
    receiver.recognitionsReceived += 1;
    if (recognition.badge.name) {
      receiver.badgeBreakdown[recognition.badge.name] =
        (receiver.badgeBreakdown[recognition.badge.name] || 0) + 1;
    }

    const dept = recognition.department || 'General';
    deptStats[dept] = deptStats[dept] || { sent: 0, received: 0 };
    deptStats[dept].sent += 1;
    deptStats[dept].received += 1;
  });

  const topRecogniser =
    Object.values(bySender).sort((a, b) => b.recognitionsGiven - a.recognitionsGiven)[0] || null;
  const mostRecognised =
    Object.values(byReceiver).sort((a, b) => b.recognitionsReceived - a.recognitionsReceived)[0] ||
    null;
  const departmentStats = Object.entries(deptStats).map(([department, data]) => ({
    department,
    sent: data.sent,
    received: data.received
  }));

  return { topRecogniser, mostRecognised, departmentStats };
};
