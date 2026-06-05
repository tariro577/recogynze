import { Injectable } from '@angular/core';
import * as teams from '@microsoft/teams-js';

@Injectable({ providedIn: 'root' })
export class TeamsService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await teams.app.initialize();
      this.initialized = true;
    } catch (error) {
      this.initialized = false;
    }
  }
}
