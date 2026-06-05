import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { interval, Subscription } from 'rxjs';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { RecognitionService } from '../shared/services/recognition.service';
import { Badge, Recognition, RecognitionFilters } from '../shared/models';
import { MatSnackBar } from '@angular/material/snack-bar';

const POLL_INTERVAL = 20000;

dayjs.extend(relativeTime);

@Component({
  selector: 'app-recognition-wall',
  templateUrl: './recognition-wall.component.html',
  styleUrls: ['./recognition-wall.component.css']
})
export class RecognitionWallComponent implements OnInit, OnDestroy {
  recognitions: Recognition[] = [];
  visibleRecognitions: Recognition[] = [];
  badges: Badge[] = [];
  spotlightName = 'Pending';
  loading = true;
  private skip = 0;
  private readonly pageSize = 10;
  private pollingSub?: Subscription;

  badgeFilter = new FormControl<string>('');
  departmentFilter = new FormControl<string>('');
  timeRangeFilter = new FormControl<'week' | 'month' | 'all'>('week');
  searchFilter = new FormControl<string>('');

  constructor(private recognitionService: RecognitionService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadBadges();
    this.loadStats();
    this.loadRecognitions();

    this.pollingSub = interval(POLL_INTERVAL).subscribe(() => this.refreshRecognitions());
  }

  ngOnDestroy(): void {
    this.pollingSub?.unsubscribe();
  }

  loadBadges(): void {
    this.recognitionService.getBadges().subscribe({
      next: (badges: Badge[]) => (this.badges = badges)
    });
  }

  loadStats(): void {
    this.recognitionService.getStats().subscribe({
      next: stats => (this.spotlightName = stats.mostRecognisedEmployee)
    });
  }

  applyFilters(): void {
    this.skip = 0;
    this.recognitions = [];
    this.visibleRecognitions = [];
    this.loadRecognitions();
  }

  loadRecognitions(): void {
    this.loading = true;
    const filters: RecognitionFilters = {
      badge: this.badgeFilter.value || undefined,
      department: this.departmentFilter.value || undefined,
      timeRange: this.timeRangeFilter.value || undefined,
      search: this.searchFilter.value || undefined
    };

    this.recognitionService.getRecognitions(filters, this.skip, this.pageSize).subscribe({
      next: (recognitions: Recognition[]) => {
        this.recognitions = [...this.recognitions, ...recognitions];
        this.visibleRecognitions = [...this.recognitions];
        this.skip += recognitions.length;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadMore(index: number): void {
    if (index >= this.visibleRecognitions.length - 3 && !this.loading) {
      this.loadRecognitions();
    }
  }

  refreshRecognitions(): void {
    this.recognitionService.getRecognitions({ timeRange: 'week' }, 0, this.pageSize).subscribe({
      next: (recognitions: Recognition[]) => {
        if (recognitions.length > this.recognitions.length) {
          this.snackBar.open('New recognition received 🎉', 'View', { duration: 3000 });
        }
        this.recognitions = recognitions;
        this.visibleRecognitions = recognitions;
      }
    });
  }

  timeAgo(date: string): string {
    return dayjs(date).fromNow();
  }

  addReaction(recognition: Recognition, type: 'clap' | 'trophy' | 'heart'): void {
    this.recognitionService.addReaction(recognition.id, type).subscribe({
      next: () => {
        recognition.reactions[type] = (recognition.reactions[type] || 0) + 1;
      }
    });
  }

  avatarUrl(name: string, url?: string): string {
    return url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1F4A9E&color=fff`;
  }
}
