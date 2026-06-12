import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Badge, LeaderboardStats, Recognition, RecognitionComment, RecognitionFilters, RecognitionPayload, RecognitionStats, UserProfile } from '../models';

const DEFAULT_BADGES: Badge[] = [
  {
    name: 'Challenging the Process',
    description: 'Seeking new ways to improve and taking smart risks.',
    template: 'Thank you for challenging the process. You questioned how things are done and tried a better way when [describe the situation]. Your courage to experiment made a real impact.',
    emoji: '🚀',
    color: '#F97316'
  },
  {
    name: 'Enabling Others to Act',
    description: 'Building trust and empowering the team.',
    template: 'Thank you for enabling others to act. You built trust and gave the team what we needed to succeed when [describe the situation]. Because of you, we delivered together.',
    emoji: '🤝',
    color: '#3B82F6'
  },
  {
    name: 'Encouraging the Heart',
    description: 'Uplifting, appreciating and celebrating others.',
    template: 'Thank you for encouraging the heart. You noticed the effort and lifted everyone’s spirits when [describe the situation]. Your care and appreciation made a real difference to the team.',
    emoji: '❤️',
    color: '#EF4444'
  },
  {
    name: 'Inspiring a Shared Vision',
    description: 'Painting a compelling picture of the future.',
    template: 'Thank you for inspiring a shared vision. You helped us see what is possible and brought us together around a common goal when [describe the situation]. Your vision moved us forward.',
    emoji: '🔭',
    color: '#A855F7'
  },
  {
    name: 'Modelling the Way',
    description: 'Leading by example and setting the standard.',
    template: 'Thank you for modelling the way. You led by example and set the standard through your actions when [describe the situation]. You showed us what great looks like.',
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

  getComments(recognitionId: string): Observable<RecognitionComment[]> {
    return this.api
      .get<RecognitionComment[]>(`/recognitions/${recognitionId}/comments`)
      .pipe(catchError(() => of([])));
  }

  addComment(recognitionId: string, message: string): Observable<RecognitionComment> {
    return this.api.post<RecognitionComment>(`/recognitions/${recognitionId}/comments`, { message });
  }

  getDepartments(): Observable<string[]> {
    return this.api.get<string[]>('/departments').pipe(catchError(() => of([])));
  }

  searchUsers(query: string): Observable<UserProfile[]> {
    return this.api.get<UserProfile[]>('/users/search', { query });
  }
}
