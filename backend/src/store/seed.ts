import { UserProfile } from '../types';
import { StoredRecognition } from './types'; // kept for memory store compatibility

/**
 * The employees the people-picker can choose from. This list is synced to the
 * employees table on every deploy (upsert), so editing here and redeploying is
 * all that's needed to update the directory.
 */
export const SEED_EMPLOYEES: UserProfile[] = [
  { id: 'kudzai.derera', displayName: 'Kudzai Derera', email: 'kudzai.derera@econetai.co.zw', department: 'Technology Services' },
  { id: 'adrian.madhigi', displayName: 'Adrian Madhigi', email: 'adrian.madhigi@econetai.co.zw', department: 'Technology Services' },
  { id: 'tariro.mashawi', displayName: 'Tariro Mashawi', email: 'tariro.mashawi@econet.co.zw', department: 'Technology Services' },
  { id: 'thabani.dlamini', displayName: 'Thabani Dlamini', email: 'thabani.dlamini@econetai.co.zw', department: 'Technology Services' },
  { id: 'loice.sibanda', displayName: 'Loice Sibanda', email: 'loice.sibanda@econet.co.zw', department: 'People and Culture' },
  { id: 'mandhla.mavolwane', displayName: 'Mandhla Mavolwane', email: 'mandhla.mavolwane@econet.co.zw', department: 'People and Culture' },
  { id: 'kudzai.jana', displayName: 'Kudzai Jana', email: 'kudzai.jana@econet.co.zw', department: 'People and Culture' },
  { id: 'kudakwashe.kaiyo', displayName: 'Kudakwashe Kaiyo', email: 'kudakwashe.kaiyo@econet.co.zw', department: 'People and Culture' }
];

export const SEED_RECOGNITIONS: StoredRecognition[] = [];
