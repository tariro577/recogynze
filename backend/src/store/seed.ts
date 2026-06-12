import { UserProfile } from '../types';
import { StoredRecognition } from './types';

/**
 * The employees the people-picker can choose from. Replace / extend this with the
 * colleagues you added to your channel. (We can't read channel membership without
 * Graph admin consent, so this list is the app's own directory.)
 *
 * When using Postgres, these seed the `employees` table on first run; edit them
 * there afterwards. When using the in-memory store, this is the live list.
 */
export const SEED_EMPLOYEES: UserProfile[] = [
  { id: 'tariro', displayName: 'Tariro Chogumaira', email: 'chogumairatariro@gmail.com', department: 'Digital' },
  { id: 'sample-1', displayName: 'Rudo Madziva', email: 'rudo.madziva@econet.co.zw', department: 'Engineering' },
  { id: 'sample-2', displayName: 'Tendai Moyo', email: 'tendai.moyo@econet.co.zw', department: 'Customer Experience' },
  { id: 'sample-3', displayName: 'Chipo Ncube', email: 'chipo.ncube@econet.co.zw', department: 'Finance' }
];

const daysAgo = (n: number): string => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

/** A few sample recognitions so the wall/leaderboard aren't empty in a fresh demo. */
export const SEED_RECOGNITIONS: StoredRecognition[] = [
  {
    id: 'seed-1',
    senderName: 'Tariro Chogumaira',
    senderEmail: 'chogumairatariro@gmail.com',
    receiverName: 'Rudo Madziva',
    receiverEmail: 'rudo.madziva@econet.co.zw',
    badgeName: 'Enabling Others to Act',
    message: 'Thank you for jumping in on the migration over the weekend — you kept the whole team unblocked.',
    department: 'Engineering',
    reactions: { clap: 3, trophy: 1, heart: 2 },
    date: daysAgo(1)
  },
  {
    id: 'seed-2',
    senderName: 'Tendai Moyo',
    senderEmail: 'tendai.moyo@econet.co.zw',
    receiverName: 'Chipo Ncube',
    receiverEmail: 'chipo.ncube@econet.co.zw',
    badgeName: 'Modelling the Way',
    message: 'The quality of your month-end reporting set the bar for all of us. Consistently brilliant.',
    department: 'Finance',
    reactions: { clap: 5, trophy: 2, heart: 1 },
    date: daysAgo(2)
  },
  {
    id: 'seed-3',
    senderName: 'Rudo Madziva',
    senderEmail: 'rudo.madziva@econet.co.zw',
    receiverName: 'Tendai Moyo',
    receiverEmail: 'tendai.moyo@econet.co.zw',
    badgeName: 'Encouraging the Heart',
    message: 'You went above and beyond helping that customer after hours. Real dedication.',
    department: 'Customer Experience',
    reactions: { clap: 4, trophy: 0, heart: 3 },
    date: daysAgo(4)
  }
];
