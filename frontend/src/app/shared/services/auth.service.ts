import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { MsalService } from '@azure/msal-angular';
import { SilentRequest } from '@azure/msal-browser';
import { environment } from '../../../environments/environment';
import { UserProfile } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private profileSubject = new BehaviorSubject<UserProfile | null>(null);
  profile$ = this.profileSubject.asObservable();
  private initialized = false;

  constructor(private msalService: MsalService) {}

  async initialize(): Promise<UserProfile | undefined> {
    if (this.initialized) {
      return this.profileSubject.value ?? undefined;
    }

    this.initialized = true;
    await this.ensureAccount();

    const profile = await this.fetchProfile();
    if (profile) {
      this.profileSubject.next(profile);
    }
    return profile ?? undefined;
  }

  /** Token for calling the Recognyze backend API (API scope in OBO mode, Graph scopes in passthrough). */
  getApiToken(): Promise<string> {
    return this.acquireToken(environment.azure.apiScopes);
  }

  /** Token for direct Microsoft Graph calls (the user's own profile + photo). */
  getGraphToken(): Promise<string> {
    return this.acquireToken(environment.azure.scopes);
  }

  /** Backwards-compatible alias used by the API service. */
  getAccessToken(): Promise<string> {
    return this.getApiToken();
  }

  private async acquireToken(scopes: string[]): Promise<string> {
    await this.ensureAccount();
    const account = this.msalService.instance.getActiveAccount();
    if (!account) {
      throw new Error('No active account found for MSAL.');
    }

    const request: SilentRequest = { account, scopes };
    const result = await firstValueFrom(this.msalService.acquireTokenSilent(request));
    if (!result) {
      throw new Error('Unable to acquire access token.');
    }

    return result.accessToken;
  }

  private async ensureAccount(): Promise<void> {
    const active = this.msalService.instance.getActiveAccount();
    if (active) {
      return;
    }

    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length > 0) {
      this.msalService.instance.setActiveAccount(accounts[0]);
      return;
    }

    try {
      // Request the union so both API and Graph resources are consented up-front.
      const loginScopes = Array.from(
        new Set([...environment.azure.apiScopes, ...environment.azure.scopes])
      );
      const result = await firstValueFrom(this.msalService.ssoSilent({ scopes: loginScopes }));
      if (result?.account) {
        this.msalService.instance.setActiveAccount(result.account);
      }
    } catch (error) {
      // SSO failed silently; user can still interact later if needed.
    }
  }

  private async fetchProfile(): Promise<UserProfile | null> {
    try {
      const token = await this.getGraphToken();
      const response = await fetch('https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName,department', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const email = data.mail || data.userPrincipalName || '';
      const photoUrl = await this.fetchPhoto(token).catch(() => undefined);

      return {
        id: data.id,
        displayName: data.displayName,
        email,
        department: data.department || 'General',
        photoUrl: photoUrl || this.buildInitialsAvatar(data.displayName)
      };
    } catch (error) {
      return null;
    }
  }

  private async fetchPhoto(token: string): Promise<string> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Photo unavailable');
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  private buildInitialsAvatar(name: string): string {
    const safeName = encodeURIComponent(name || 'User');
    return `https://ui-avatars.com/api/?name=${safeName}&background=1F4A9E&color=fff`;
  }
}
