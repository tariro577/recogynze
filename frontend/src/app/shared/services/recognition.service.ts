import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Badge, LeaderboardStats, Recognition, RecognitionFilters, RecognitionPayload, RecognitionStats, UserProfile } from '../models';

const DEFAULT_BADGES: Badge[] = [
  {
    name: 'Teamwork',
    description: 'Celebrate collaboration and support.',
    template: 'Thank you for always showing up for the team. The way you [add specific action] made a real difference...',
    emoji: '🤝',
    color: '#3B82F6'
  },
  {
    name: 'Innovation',
    description: 'Celebrate fresh thinking and creativity.',
    template: 'Your creative thinking on [project] was outstanding. You brought a fresh perspective by...',
    emoji: '💡',
    color: '#FBBF24'
  },
  {
    name: 'Leadership',
    description: 'Recognise strong guidance.',
    template: 'You led by example when [situation]. Your guidance helped the team...',
    emoji: '⭐',
    color: '#A855F7'
  },
  {
    name: 'Goes the Extra Mile',
    description: 'Celebrate dedication beyond expectations.',
    template: 'You went above and beyond by [action]. This level of dedication is what makes our team exceptional...',
    emoji: '🎯',
    color: '#F97316'
  },
  {
    name: 'Resilience',
    description: 'Celebrate perseverance under pressure.',
    template: 'Even under pressure you [action]. Your ability to stay focused and deliver is truly inspiring...',
    emoji: '💪',
    color: '#22C55E'
  },
  {
    name: 'Excellence',
    description: 'Recognise high-quality execution.',
    template: 'The quality of your work on [project] set the bar for all of us. You consistently deliver...',
    emoji: '🌟',
    color: '#0EA5E9'
  }
];

@Injectable({ providedIn: 'root' })
export class RecognitionService {
  constructor(private api: ApiService) {}

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
    return this.api.post<Recognition>('/recognitions', payload);
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
