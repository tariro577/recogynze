import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MsalModule, MsalRedirectComponent } from '@azure/msal-angular';

import { AppComponent } from './app.component';
import { LandingComponent } from './landing/landing.component';
import { RecognitionFormComponent } from './recognition-form/recognition-form.component';
import { RecognitionWallComponent } from './recognition-wall/recognition-wall.component';
import { ProfileComponent } from './profile/profile.component';
import { LeaderboardComponent } from './leaderboard/leaderboard.component';
import { TeamsConfigComponent } from './teams-config/teams-config.component';
import { AppRoutingModule } from './app-routing.module';
import { msalInstanceFactory, msalGuardConfigFactory } from './auth-config';
import { MSAL_GUARD_CONFIG, MSAL_INSTANCE, MsalGuard, MsalService } from '@azure/msal-angular';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { ScrollingModule } from '@angular/cdk/scrolling';

@NgModule({
  declarations: [
    AppComponent,
    LandingComponent,
    RecognitionFormComponent,
    RecognitionWallComponent,
    ProfileComponent,
    LeaderboardComponent,
    TeamsConfigComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule,
    MsalModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatInputModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTabsModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatTooltipModule,
    MatListModule,
    MatDividerModule,
    ScrollingModule
  ],
  providers: [
    {
      provide: MSAL_INSTANCE,
      useFactory: msalInstanceFactory
    },
    {
      provide: MSAL_GUARD_CONFIG,
      useFactory: msalGuardConfigFactory
    },
    MsalService,
    MsalGuard
  ],
  bootstrap: [AppComponent, MsalRedirectComponent]
})
export class AppModule { }