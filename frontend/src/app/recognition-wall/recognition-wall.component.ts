import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { interval, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { RecognitionService } from '../shared/services/recognition.service';
import { Badge, Recognition, RecognitionComment, RecognitionFilters } from '../shared/models';
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
  badges: Badge[] = [];
  departments: string[] = [];
  spotlightName = 'Pending';
  loading = true;
  hasMore = true;
  private skip = 0;
  private readonly pageSize = 10;
  private pollingSub?: Subscription;
  private searchSub?: Subscription;
  /** Bumped whenever filters reset; stale in-flight responses are discarded. */
  private loadGeneration = 0;

  // Per-recognition comment state, keyed by recognition id.
  commentsOpen: Record<string, boolean> = {};
  commentsById: Record<string, RecognitionComment[]> = {};
  commentsLoading: Record<string, boolean> = {};
  commentDrafts: Record<string, string> = {};
  commentSending: Record<string, boolean> = {};

  badgeFilter = new FormControl<string>('');
  departmentFilter = new FormControl<string>('');
  timeRangeFilter = new FormControl<'week' | 'month' | 'all'>('week');
  searchFilter = new FormControl<string>('');

  constructor(private recognitionService: RecognitionService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadBadges();
    this.loadDepartments();
    this.loadStats();
    this.loadRecognitions();

    this.pollingSub = interval(POLL_INTERVAL).subscribe(() => this.refreshRecognitions());
    this.searchSub = this.searchFilter.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.applyFilters());
  }

  ngOnDestroy(): void {
    this.pollingSub?.unsubscribe();
    this.searchSub?.unsubscribe();
  }

  loadBadges(): void {
    this.recognitionService.getBadges().subscribe({
      next: (badges: Badge[]) => (this.badges = badges)
    });
  }

  loadDepartments(): void {
    this.recognitionService.getDepartments().subscribe({
      next: (departments: string[]) => (this.departments = departments)
    });
  }

  loadStats(): void {
    this.recognitionService.getStats().subscribe({
      next: stats => (this.spotlightName = stats.mostRecognisedEmployee)
    });
  }

  applyFilters(): void {
    this.loadGeneration++;
    this.skip = 0;
    this.hasMore = true;
    this.recognitions = [];
    this.loadRecognitions();
  }

  private currentFilters(): RecognitionFilters {
    return {
      badge: this.badgeFilter.value || undefined,
      department: this.departmentFilter.value || undefined,
      timeRange: this.timeRangeFilter.value || undefined,
      search: this.searchFilter.value || undefined
    };
  }

  loadRecognitions(): void {
    const generation = this.loadGeneration;
    this.loading = true;
    this.recognitionService.getRecognitions(this.currentFilters(), this.skip, this.pageSize).subscribe({
      next: (recognitions: Recognition[]) => {
        if (generation !== this.loadGeneration) {
          return; // filters changed while this request was in flight
        }
        // Dedupe by id: a recognition created between two pages shifts every
        // offset, so the boundary item can come back twice.
        const seen = new Set(this.recognitions.map(r => r.id));
        this.recognitions = [...this.recognitions, ...recognitions.filter(r => !seen.has(r.id))];
        this.skip += recognitions.length;
        this.hasMore = recognitions.length === this.pageSize;
        this.loading = false;
      },
      error: () => {
        if (generation === this.loadGeneration) {
          this.loading = false;
        }
      }
    });
  }

  loadMore(): void {
    if (!this.loading && this.hasMore) {
      this.loadRecognitions();
    }
  }

  refreshRecognitions(): void {
    if (this.loading) {
      return; // don't race an in-flight page load
    }
    const generation = this.loadGeneration;
    const top = Math.max(this.skip, this.pageSize);
    this.recognitionService.getRecognitions(this.currentFilters(), 0, top).subscribe({
      next: (recognitions: Recognition[]) => {
        if (generation !== this.loadGeneration || this.loading) {
          return;
        }
        const previousHeadId = this.recognitions[0]?.id;
        if (recognitions.length && previousHeadId && recognitions[0].id !== previousHeadId) {
          this.snackBar.open('New recognition received 🎉', 'View', { duration: 3000 });
        }
        this.recognitions = recognitions;
        this.skip = recognitions.length;
        this.hasMore = recognitions.length === top;
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

  toggleComments(recognition: Recognition): void {
    const open = !this.commentsOpen[recognition.id];
    this.commentsOpen[recognition.id] = open;
    if (open && !this.commentsById[recognition.id]) {
      this.loadComments(recognition);
    }
  }

  loadComments(recognition: Recognition): void {
    this.commentsLoading[recognition.id] = true;
    this.recognitionService.getComments(recognition.id).subscribe({
      next: (comments: RecognitionComment[]) => {
        this.commentsById[recognition.id] = comments;
        recognition.commentCount = comments.length;
        this.commentsLoading[recognition.id] = false;
      },
      error: () => {
        this.commentsLoading[recognition.id] = false;
      }
    });
  }

  submitComment(recognition: Recognition): void {
    const draft = (this.commentDrafts[recognition.id] || '').trim();
    if (!draft || this.commentSending[recognition.id]) {
      return;
    }
    this.commentSending[recognition.id] = true;
    this.recognitionService.addComment(recognition.id, draft).subscribe({
      next: (comment: RecognitionComment) => {
        this.commentsById[recognition.id] = [...(this.commentsById[recognition.id] || []), comment];
        this.commentDrafts[recognition.id] = '';
        recognition.commentCount = (recognition.commentCount || 0) + 1;
        this.commentSending[recognition.id] = false;
      },
      error: (err: { error?: { message?: string } }) => {
        this.commentSending[recognition.id] = false;
        this.snackBar.open(
          err?.error?.message || 'Could not post your comment. Please try again.',
          'Dismiss',
          { duration: 4000 }
        );
      }
    });
  }

  avatarUrl(name: string, url?: string): string {
    return url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1F4A9E&color=fff`;
  }

  trackById(_index: number, item: Recognition): string {
    return item.id;
  }
}
