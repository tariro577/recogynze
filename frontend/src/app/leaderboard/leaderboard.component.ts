import { Component, OnInit } from '@angular/core';
import { RecognitionService } from '../shared/services/recognition.service';
import { DepartmentStat, LeaderboardStats } from '../shared/models';

@Component({
  selector: 'app-leaderboard',
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.css']
})
export class LeaderboardComponent implements OnInit {
  stats: LeaderboardStats | null = null;
  private maxDepartmentReceived = 1;

  constructor(private recognitionService: RecognitionService) {}

  ngOnInit(): void {
    this.recognitionService.getLeaderboard().subscribe({
      next: (stats: LeaderboardStats) => {
        this.stats = stats;
        this.maxDepartmentReceived = Math.max(
          1,
          ...stats.departmentStats.map((d: DepartmentStat) => d.received)
        );
      }
    });
  }

  /** Bar width (%) for the department chart, relative to the busiest department. */
  departmentBarWidth(stat: DepartmentStat): number {
    return Math.round((stat.received / this.maxDepartmentReceived) * 100);
  }

  avatarUrl(name?: string, url?: string): string {
    if (url) {
      return url;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=1F4A9E&color=fff`;
  }
}
