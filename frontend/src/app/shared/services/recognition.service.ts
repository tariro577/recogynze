import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Badge, LeaderboardStats, Recognition, RecognitionFilters, RecognitionPayload, RecognitionStats, UserProfile } from '../models';

const DEFAULT_BADGES: Badge[] = [
  {
    name: 'Challenging the Process',
    description: 'Seeking new ways to improve and taking smart risks.',
    template: 'Thank you for challenging the status quo when [situation]. Your willingness to try a new approach made a real difference...',
    emoji: '🚀',
    color: '#F97316'
  },
  {
    name: 'Enabling Others to Act',
    description: 'Building trust and empowering the team.',
    template: 'You empowered the team by [action]. The way you built trust and brought people together...',
    emoji: '🤝',
    color: '#3B82F6'
  },
  {
    name: 'Encouraging the Heart',
    description: 'Uplifting, appreciating and celebrating others.',
    template: 'You lifted the team when [situation]. Your appreciation and support meant so much...',
    emoji: '❤️',
    color: '#EF4444'
  },
  {
    name: 'Inspiring a Shared Vision',
    description: 'Painting a compelling picture of the future.',
    template: 'You inspired us with your vision for [project/goal]. The way you helped everyone see what is possible...',
    emoji: '🔭',
    color: '#A855F7'
  },
  {
    name: 'Modelling the Way',
    description: 'Leading by example and setting the standard.',
    template: 'You led by example when [situation]. Your standards and integrity set the bar for all of us...',
    emoji: '🧭',
    color: '#14B8A6'
  }
];

@Injectable({ providedIn: 'root' })
export class RecognitionService {
  constructor(private api: ApiService, private auth: AuthService) {}

  getBadges(): Observable<Badge[]> {
    return this.api.get<Badge[]>('/badges').pipe(catchError(() => of(DEFAULT_BADGES)));
  }

  getRecognitions(filters?: RecognitionFilters, skip = 0, top = 20): Observable<Recognition[]> {
    return this.api.get<Recognition[]>('/recognitions', {
      skip,
      top,
      badge: filters?.badge,
      department: filters?.department,
      timeRange: filters?.timeRange,
      search: filters?.search
    }).pipe(catchError(() => of([])));
  }

  createRecognition(payload: RecognitionPayload): Observable<Recognition> {
    // Sender identity comes from the Teams context (no login required).
    const sender = this.auth.currentProfile();
    return this.api.post<Recognition>('/recognitions', {
      ...payload,
      senderName: sender.displayName,
      senderEmail: sender.email
    });
  }

  getStats(): Observable<RecognitionStats> {
    return this.api.get<RecognitionStats>('/stats').pipe(
      catchError(() => of({ totalRecognitions: 0, mostUsedBadge: '—', mostRecognisedEmployee: '—' }))
    );
  }

  getLeaderboard(): Observable<LeaderboardStats> {
    return this.api.get<LeaderboardStats>('/leaderboard').pipe(
      catchError(() =>
        of({
          topRecogniser: null,
          mostRecognised: null,
          departmentStats: []
        })
      )
    );
  }

  addReaction(recognitionId: string, type: string): Observable<void> {
    return this.api.post<void>(`/recognitions/${recognitionId}/reactions`, { type });
  }

  searchUsers(query: string): Observable<UserProfile[]> {
    return this.api.get<UserProfile[]>('/users/search', { query });
  }
}
