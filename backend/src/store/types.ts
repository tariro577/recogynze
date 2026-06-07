import { ReactionCounts, ReactionType, UserProfile } from '../types';

/** A recognition as persisted by a store (badge stored by name; reactions as counts). */
export interface StoredRecognition {
  id: string;
  senderName: string;
  senderEmail: string;
  receiverName: string;
  receiverEmail: string;
  badgeName: string;
  message: string;
  department: string;
  reactions: ReactionCounts;
  date: string;
}

export interface NewRecognition {
  senderName: string;
  senderEmail: string;
  receiverName: string;
  receiverEmail: string;
  badgeName: string;
  message: string;
  department: string;
}

/**
 * Persistence boundary. Two implementations exist: an in-memory store (zero setup,
 * great for demos / Teams preview) and a Postgres store (durable). The data
 * service depends only on this interface, so swapping backends changes nothing else.
 */
export interface Store {
  /** Create tables / seed data as needed. Safe to call repeatedly. */
  init(): Promise<void>;
  listRecognitions(): Promise<StoredRecognition[]>;
  createRecognition(input: NewRecognition): Promise<StoredRecognition>;
  addReaction(recognitionId: string, userEmail: string, type: ReactionType): Promise<void>;
  listEmployees(): Promise<UserProfile[]>;
  searchEmployees(query: string): Promise<UserProfile[]>;
  /** Replace the entire employee directory (admin). */
  setEmployees(employees: UserProfile[]): Promise<void>;
  /** Remove all recognitions and reactions (admin — e.g. clearing test data). */
  clearRecognitions(): Promise<void>;
}
