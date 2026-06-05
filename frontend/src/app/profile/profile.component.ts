import { Component, OnInit } from '@angular/core';
import { RecognitionService } from '../shared/services/recognition.service';
import { AuthService } from '../shared/services/auth.service';
import { Recognition, UserProfile } from '../shared/models';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profile: UserProfile | null = null;
  recognitions: Recognition[] = [];
  badges: { name: string; count: number }[] = [];
  recognitionsGiven = 0;
  recognitionsReceived = 0;
  streak = 0;
  highlight: Recognition | null = null;

  constructor(private recognitionService: RecognitionService, private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.profile$.subscribe(profile => {
      this.profile = profile;
      if (profile) {
        this.loadRecognitions(profile.email);
      }
    });
  }

  loadRecognitions(email: string): void {
    this.recognitionService.getRecognitions({ search: email }, 0, 100).subscribe({
      next: recognitions => {
        this.recognitions = recognitions;
        this.recognitionsGiven = recognitions.filter(r => r.senderEmail === email).length;
        this.recognitionsReceived = recognitions.filter(r => r.receiverEmail === email).length;
        this.computeBadges(email);
        this.computeStreak(email);
        this.computeHighlight();
      }
    });
  }

  computeBadges(email: string): void {
    const badgeCounts: Record<string, number> = {};
    this.recognitions
      .filter(r => r.receiverEmail === email)
      .forEach(r => {
        badgeCounts[r.badge.name] = (badgeCounts[r.badge.name] || 0) + 1;
      });
    this.badges = Object.entries(badgeCounts).map(([name, count]) => ({ name, count }));
  }

  computeStreak(email: string): void {
    const dates = this.recognitions
      .filter(r => r.senderEmail === email)
      .map(r => new Date(r.date).toDateString());
    const uniqueDates = Array.from(new Set(dates)).sort();
    let streak = 0;
    let lastDate: Date | null = null;
    uniqueDates.forEach(dateStr => {
      const date = new Date(dateStr);
      if (!lastDate) {
        streak = 1;
      } else {
        const diffDays = (date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        streak = diffDays === 1 ? streak + 1 : 1;
      }
      lastDate = date;
    });
    this.streak = streak;
  }

  computeHighlight(): void {
    if (!this.recognitions.length) {
      this.highlight = null;
      return;
    }
    this.highlight = this.recognitions.reduce((best, current) => {
      const bestScore = Object.values(best.reactions).reduce((a, b) => a + b, 0);
      const currentScore = Object.values(current.reactions).reduce((a, b) => a + b, 0);
      return currentScore > bestScore ? current : best;
    });
  }

  /** Width as a percentage of the larger of the two values, so the chart always scales nicely. */
  barWidth(value: number): number {
    const max = Math.max(this.recognitionsGiven, this.recognitionsReceived, 1);
    return Math.round((value / max) * 100);
  }

  avatarUrl(): string {
    return this.profile?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.profile?.displayName || 'User')}&background=1F4A9E&color=fff`;
  }
}
