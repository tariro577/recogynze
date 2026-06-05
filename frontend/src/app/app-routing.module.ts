import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { RecognitionFormComponent } from './recognition-form/recognition-form.component';
import { RecognitionWallComponent } from './recognition-wall/recognition-wall.component';
import { ProfileComponent } from './profile/profile.component';
import { LeaderboardComponent } from './leaderboard/leaderboard.component';
import { TeamsConfigComponent } from './teams-config/teams-config.component';

const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'recognize', component: RecognitionFormComponent },
  { path: 'wall', component: RecognitionWallComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'leaderboard', component: LeaderboardComponent },
  { path: 'config', component: TeamsConfigComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
