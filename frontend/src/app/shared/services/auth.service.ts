import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UserProfile } from '../models';
import { TeamsService } from './teams.service';

const avatar = (name: string): string =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=1F4A9E&color=fff`;

const GUEST: UserProfile = {
  id: 'guest',
  displayName: 'Guest User',
  email: 'guest@recognyze.local',
  department: 'General',
  photoUrl: avatar('Guest User')
};

/**
 * Identity service. Resolves the current user from the Teams context (no login
 * screen, no Azure AD). Falls back to a guest profile when running outside Teams
 * so the app is still usable for local dev and the Teams preview.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private profileSubject = new BehaviorSubject<UserProfile | null>(null);
  profile$ = this.profileSubject.asObservable();
  private current: UserProfile = GUEST;

  constructor(private teams: TeamsService) {}

  async initialize(): Promise<UserProfile> {
    const teamsUser = await this.teams.getCurrentUser();
    this.current = teamsUser
      ? { ...teamsUser, photoUrl: avatar(teamsUser.displayName) }
      : GUEST;
    this.profileSubject.next(this.current);
    return this.current;
  }

  /** Synchronous accessor used when building API request headers / payloads. */
  currentProfile(): UserProfile {
    return this.current;
  }
}
