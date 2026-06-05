import { Component, OnInit } from '@angular/core';
import { RecognitionService } from '../shared/services/recognition.service';
import { LeaderboardStats } from '../shared/models';

@Component({
  selector: 'app-leaderboard',
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.css']
})
export class LeaderboardComponent implements OnInit {
  stats: LeaderboardStats | null = null;

  constructor(private recognitionService: RecognitionService) {}

  ngOnInit(): void {
    this.recognitionService.getLeaderboard().subscribe({
      next: (stats: LeaderboardStats) => (this.stats = stats)
    });
  }

  avatarUrl(name?: string, url?: string): string {
    if (url) {
      return url;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=1F4A9E&color=fff`;
  }
}
