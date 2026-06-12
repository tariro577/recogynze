export type ReactionType = 'clap' | 'trophy' | 'heart';

export interface Badge {
  id?: string;
  name: string;
  description: string;
  template: string;
  emoji: string;
  color: string;
}

export interface Recognition {
  id: string;
  senderName: string;
  senderEmail: string;
  senderPhotoUrl?: string;
  receiverName: string;
  receiverEmail: string;
  receiverPhotoUrl?: string;
  badge: Badge;
  message: string;
  date: string;
  reactions: Record<ReactionType, number>;
  department?: string;
  commentCount?: number;
}

export interface RecognitionComment {
  id: string;
  recognitionId: string;
  authorName: string;
  authorEmail: string;
  authorPhotoUrl?: string;
  message: string;
  date: string;
}

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  /** True for client-generated bubbles (greeting, error notices) that must not
   *  be replayed to the model as real conversation turns. */
  isLocal?: boolean;
}

export interface RecognitionStats {
  totalRecognitions: number;
  mostUsedBadge: string;
  mostRecognisedEmployee: string;
}

export interface RecognitionFilters {
  badge?: string;
  department?: string;
  timeRange?: 'week' | 'month' | 'all';
  search?: string;
}

export interface LeaderboardEntry {
  name: string;
  department: string;
  recognitionsGiven: number;
  recognitionsReceived: number;
  badgeBreakdown: Record<string, number>;
  photoUrl?: string;
}

export interface DepartmentStat {
  department: string;
  sent: number;
  received: number;
}

export interface LeaderboardStats {
  topRecogniser: LeaderboardEntry | null;
  mostRecognised: LeaderboardEntry | null;
  departmentStats: DepartmentStat[];
  /** Employees ranked by recognitions received this week (top 10). */
  topReceivers?: LeaderboardEntry[];
  /** Employees ranked by recognitions given this week (top 10). */
  topGivers?: LeaderboardEntry[];
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  department: string;
  photoUrl?: string;
}

export interface RecognitionPayload {
  receiverEmail: string;
  receiverName: string;
  badgeName: string;
  message: string;
  department?: string;
}
