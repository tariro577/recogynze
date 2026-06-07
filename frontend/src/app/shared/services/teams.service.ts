import { Injectable } from '@angular/core';
import * as microsoftTeams from '@microsoft/teams-js';
import { UserProfile } from '../models';

/**
 * Thin wrapper over the Teams JS SDK. We use getContext() to learn who the
 * signed-in user is — no MSAL, no Azure AD app, no admin consent required.
 * Outside Teams (plain browser / local dev) this returns null and the app falls
 * back to a guest identity.
 */
@Injectable({ providedIn: 'root' })
export class TeamsService {
  private initialized = false;
  private insideTeams = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    try {
      await microsoftTeams.app.initialize();
      this.insideTeams = true;
    } catch {
      this.insideTeams = false;
    }
    this.initialized = true;
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    await this.initialize();
    if (!this.insideTeams) {
      return null;
    }
    try {
      const ctx = await microsoftTeams.app.getContext();
      const email = ctx.user?.userPrincipalName || '';
      if (!email) {
        return null;
      }
      const displayName = (ctx.user as { displayName?: string })?.displayName || email.split('@')[0];
      return {
        id: ctx.user?.id || email,
        displayName,
        email,
        department: 'General'
      };
    } catch {
      return null;
    }
  }
}
