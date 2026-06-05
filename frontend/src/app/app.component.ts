import { Component, OnInit } from '@angular/core';
import { AuthService } from './shared/services/auth.service';
import { PreferencesService } from './shared/services/preferences.service';
import { TeamsService } from './shared/services/teams.service';
import { ThemeService } from './shared/services/theme.service';
import { UserProfile } from './shared/models';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  isDarkMode = false;
  soundEnabled = true;
  profile?: UserProfile;

  constructor(
    private themeService: ThemeService,
    private preferencesService: PreferencesService,
    private authService: AuthService,
    private teamsService: TeamsService
  ) {}

  ngOnInit(): void {
    this.themeService.mode$.subscribe((mode: 'light' | 'dark') => {
      this.isDarkMode = mode === 'dark';
    });

    this.preferencesService.soundEnabled$.subscribe((enabled: boolean) => {
      this.soundEnabled = enabled;
    });

    this.teamsService.initialize();

    this.authService.initialize().then((profile: UserProfile | undefined) => {
      this.profile = profile;
    }).catch(() => undefined);
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  toggleSound(enabled: boolean): void {
    this.preferencesService.setSound(enabled);
  }
}
