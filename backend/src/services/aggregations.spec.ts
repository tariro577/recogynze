import {
  aggregateReactions,
  computeLeaderboard,
  computeStats,
  isWithinRange,
  matchesFilters,
  paginate,
  sortNewestFirst
} from './aggregations';
import { Recognition } from '../types';

const NOW = new Date('2026-06-05T12:00:00.000Z').getTime();
const daysAgo = (n: number) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();

const make = (overrides: Partial<Recognition>): Recognition => ({
  id: '1',
  senderName: 'Alice Moyo',
  senderEmail: 'alice@econet.co.zw',
  receiverName: 'Brian Ncube',
  receiverEmail: 'brian@econet.co.zw',
  badge: { name: 'Teamwork', emoji: '🤝', color: '#000', description: '', template: '' },
  message: 'Great work',
  date: daysAgo(1),
  reactions: { clap: 0, trophy: 0, heart: 0 },
  department: 'Engineering',
  commentCount: 0,
  ...overrides
});

describe('aggregateReactions', () => {
  it('counts reactions per recognition and type, ignoring malformed rows', () => {
    const map = aggregateReactions([
      { RecognitionId: 'a', Type: 'clap' },
      { RecognitionId: 'a', Type: 'clap' },
      { RecognitionId: 'a', Type: 'heart' },
      { RecognitionId: 'b', Type: 'trophy' },
      { RecognitionId: undefined, Type: 'clap' },
      { RecognitionId: 'a', Type: 'bogus' as any }
    ]);
    expect(map['a']).toEqual({ clap: 2, trophy: 0, heart: 1 });
    expect(map['b']).toEqual({ clap: 0, trophy: 1, heart: 0 });
  });
});

describe('isWithinRange', () => {
  it('handles week, month and all', () => {
    expect(isWithinRange(daysAgo(3), 'week', NOW)).toBe(true);
    expect(isWithinRange(daysAgo(10), 'week', NOW)).toBe(false);
    expect(isWithinRange(daysAgo(20), 'month', NOW)).toBe(true);
    expect(isWithinRange(daysAgo(40), 'month', NOW)).toBe(false);
    expect(isWithinRange(daysAgo(400), 'all', NOW)).toBe(true);
    expect(isWithinRange(daysAgo(400), undefined, NOW)).toBe(true);
  });
});

describe('matchesFilters', () => {
  const item = make({ badge: { name: 'Innovation', emoji: '', color: '', description: '', template: '' } });

  it('matches by badge, department and time', () => {
    expect(matchesFilters(item, { badge: 'inno' }, NOW)).toBe(true);
    expect(matchesFilters(item, { badge: 'leadership' }, NOW)).toBe(false);
    // department comes from a dropdown of exact names: exact (case-insensitive)
    // match only, so "Digital" can't also match "Digital Services"
    expect(matchesFilters(item, { department: 'engineering' }, NOW)).toBe(true);
    expect(matchesFilters(item, { department: 'Engineering' }, NOW)).toBe(true);
    expect(matchesFilters(item, { department: 'engineer' }, NOW)).toBe(false);
    expect(matchesFilters(item, { timeRange: 'week' }, NOW)).toBe(true);
  });

  it('matches search against both names and emails (fixes the profile-by-email lookup)', () => {
    expect(matchesFilters(item, { search: 'brian@econet' }, NOW)).toBe(true);
    expect(matchesFilters(item, { search: 'alice moyo' }, NOW)).toBe(true);
    expect(matchesFilters(item, { search: 'nobody' }, NOW)).toBe(false);
  });
});

describe('sortNewestFirst + paginate', () => {
  it('sorts by date desc and pages without mutating input', () => {
    const items = [make({ id: 'old', date: daysAgo(5) }), make({ id: 'new', date: daysAgo(1) })];
    const sorted = sortNewestFirst(items);
    expect(sorted.map(i => i.id)).toEqual(['new', 'old']);
    expect(items[0].id).toBe('old'); // original untouched
    expect(paginate(sorted, 0, 1).map(i => i.id)).toEqual(['new']);
    expect(paginate(sorted, 1, 1).map(i => i.id)).toEqual(['old']);
  });
});

describe('computeStats', () => {
  it('reports totals, most-used badge this week and most-recognised this month', () => {
    const data = [
      make({ id: '1', badge: { name: 'Teamwork', emoji: '', color: '', description: '', template: '' }, receiverName: 'Brian', date: daysAgo(1) }),
      make({ id: '2', badge: { name: 'Teamwork', emoji: '', color: '', description: '', template: '' }, receiverName: 'Brian', date: daysAgo(2) }),
      make({ id: '3', badge: { name: 'Innovation', emoji: '', color: '', description: '', template: '' }, receiverName: 'Chipo', date: daysAgo(2) })
    ];
    const stats = computeStats(data, NOW);
    expect(stats.totalRecognitions).toBe(3);
    expect(stats.mostUsedBadge).toBe('Teamwork');
    expect(stats.mostRecognisedEmployee).toBe('Brian');
  });

  it('returns em dashes when empty', () => {
    const stats = computeStats([], NOW);
    expect(stats).toEqual({ totalRecognitions: 0, mostUsedBadge: '—', mostRecognisedEmployee: '—' });
  });
});

describe('computeLeaderboard', () => {
  it('ranks top recogniser and most recognised over the last week', () => {
    const data = [
      make({ id: '1', senderEmail: 'a@x', senderName: 'A', receiverEmail: 'b@x', receiverName: 'B', date: daysAgo(1) }),
      make({ id: '2', senderEmail: 'a@x', senderName: 'A', receiverEmail: 'c@x', receiverName: 'C', date: daysAgo(2) }),
      make({ id: '3', senderEmail: 'd@x', senderName: 'D', receiverEmail: 'b@x', receiverName: 'B', date: daysAgo(2) }),
      // outside the week window — must be ignored
      make({ id: '4', senderEmail: 'a@x', senderName: 'A', receiverEmail: 'b@x', receiverName: 'B', date: daysAgo(30) })
    ];
    const board = computeLeaderboard(data, NOW);
    expect(board.topRecogniser?.name).toBe('A');
    expect(board.topRecogniser?.recognitionsGiven).toBe(2);
    expect(board.mostRecognised?.name).toBe('B');
    expect(board.mostRecognised?.recognitionsReceived).toBe(2);
    // department on a recognition is the receiver's department
    expect(board.departmentStats.find(d => d.department === 'Engineering')?.received).toBe(3);
    // senders unknown to the (empty) directory are attributed to General, not
    // to the receiving department
    expect(board.departmentStats.find(d => d.department === 'General')?.sent).toBe(3);
    expect(board.departmentStats.find(d => d.department === 'Engineering')?.sent).toBe(0);
  });

  it('attributes sent counts to the sender department from the employee directory', () => {
    const employees = [
      { id: 'a', displayName: 'A', email: 'A@X', department: 'Finance' },
      { id: 'b', displayName: 'B', email: 'b@x', department: 'Engineering' }
    ];
    const data = [
      // mixed-case sender email must still resolve and bucket as one person
      make({ id: '1', senderEmail: 'a@x', senderName: 'A', receiverEmail: 'b@x', receiverName: 'B', date: daysAgo(1) }),
      make({ id: '2', senderEmail: 'A@X', senderName: 'A', receiverEmail: 'b@x', receiverName: 'B', date: daysAgo(2) })
    ];
    const board = computeLeaderboard(data, NOW, employees);
    expect(board.topRecogniser?.recognitionsGiven).toBe(2);
    expect(board.topRecogniser?.department).toBe('Finance');
    expect(board.departmentStats.find(d => d.department === 'Finance')?.sent).toBe(2);
    expect(board.departmentStats.find(d => d.department === 'Engineering')?.received).toBe(2);
    expect(board.topReceivers.length).toBe(1);
    expect(board.topGivers.length).toBe(1);
  });
});
