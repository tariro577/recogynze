import { Component } from '@angular/core';
import * as teams from '@microsoft/teams-js';

@Component({
  selector: 'app-teams-config',
  templateUrl: './teams-config.component.html',
  styleUrls: ['./teams-config.component.css']
})
export class TeamsConfigComponent {
  configured = false;

  async saveConfiguration(): Promise<void> {
    try {
      await teams.pages.config.initialize();
      teams.pages.config.setConfig({
        suggestedDisplayName: 'Recognition Wall',
        contentUrl: window.location.origin + '/wall',
        websiteUrl: window.location.origin + '/wall',
        entityId: 'recognitionWall'
      });
      teams.pages.config.setValidityState(true);
      this.configured = true;
    } catch (error) {
      this.configured = false;
    }
  }
}
