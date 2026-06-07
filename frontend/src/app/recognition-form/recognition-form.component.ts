import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { debounceTime, startWith, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { RecognitionService } from '../shared/services/recognition.service';
import { Badge, RecognitionPayload, UserProfile } from '../shared/models';
import { containsAppearanceComment } from '../shared/utils/moderation';
import { PreferencesService } from '../shared/services/preferences.service';

@Component({
  selector: 'app-recognition-form',
  templateUrl: './recognition-form.component.html',
  styleUrls: ['./recognition-form.component.css']
})
export class RecognitionFormComponent implements OnInit {
  form: FormGroup;
  receiverControl = new FormControl<UserProfile | null>(null, Validators.required);
  badgeControl = new FormControl<Badge | null>(null, Validators.required);
  messageControl = new FormControl('', [Validators.required, Validators.maxLength(420)]);
  filteredPeople$: Observable<UserProfile[]> = of([]);
  badges: Badge[] = [];
  errorMessage = '';
  confettiActive = false;
  confettiPieces = Array.from({ length: 18 }, (_, index) => index);
  characterCount = 0;
  maxCharacters = 420;
  soundEnabled = true;

  private celebratoryAudio = new Audio('data:audio/wav;base64,UklGRhIAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQwAAAAA/////wAAAP///wAAAP///wAAAP///wAAAP///wAAAP///wAAAP///wAAAP///w==');

  constructor(
    private fb: FormBuilder,
    private recognitionService: RecognitionService,
    private preferencesService: PreferencesService
  ) {
    this.form = this.fb.group({
      receiver: this.receiverControl,
      badge: this.badgeControl,
      message: this.messageControl
    });
  }

  ngOnInit(): void {
    this.recognitionService.getBadges().subscribe({
      next: (badges: Badge[]) => {
        this.badges = badges;
        if (badges.length) {
          this.badgeControl.setValue(badges[0]);
          this.applyBadgeTemplate(badges[0]);
        }
      }
    });

    this.filteredPeople$ = this.receiverControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      switchMap((value: string | UserProfile | null) => {
        // Empty box -> list everyone; typing -> search; a picked person -> no list.
        if (value === null || value === '' || typeof value === 'string') {
          return this.recognitionService.searchUsers(typeof value === 'string' ? value : '');
        }
        return of([]);
      })
    );

    this.messageControl.valueChanges.subscribe((value: string | null) => {
      this.characterCount = value?.length ?? 0;
    });

    this.preferencesService.soundEnabled$.subscribe((enabled: boolean) => {
      this.soundEnabled = enabled;
    });
  }

  displayPerson(person: UserProfile): string {
    return person?.displayName || '';
  }

  selectBadge(badge: Badge): void {
    this.badgeControl.setValue(badge);
    this.applyBadgeTemplate(badge);
  }

  applyBadgeTemplate(badge: Badge): void {
    this.messageControl.setValue(badge.template);
  }

  submit(): void {
    this.errorMessage = '';
    if (this.form.invalid) {
      this.errorMessage = 'Please complete all fields before submitting.';
      return;
    }

    const message = this.messageControl.value ?? '';
    if (containsAppearanceComment(message)) {
      this.errorMessage = 'Recognition should celebrate professional contributions, not appearance. Please focus on their work and impact!';
      return;
    }

    const receiver = this.receiverControl.value as UserProfile;
    const badge = this.badgeControl.value as Badge;

    // The receiver must be picked from the dropdown (an object with an email),
    // not just typed as free text — otherwise we have no one to send it to.
    if (!receiver || typeof receiver === 'string' || !receiver.email) {
      this.errorMessage = 'Please choose a colleague from the list. Start typing their name and select them from the dropdown.';
      return;
    }

    const payload: RecognitionPayload = {
      receiverEmail: receiver.email,
      receiverName: receiver.displayName,
      badgeName: badge.name,
      message,
      department: receiver.department
    };

    this.recognitionService.createRecognition(payload).subscribe({
      next: () => {
        this.triggerCelebration();
        this.form.reset();
        this.badgeControl.setValue(badge);
        this.applyBadgeTemplate(badge);
      },
      error: (err: { error?: { message?: string } }) => {
        this.errorMessage = err?.error?.message || 'Something went wrong sending recognition. Please try again.';
      }
    });
  }

  private triggerCelebration(): void {
    this.confettiActive = true;
    if (this.soundEnabled) {
      this.celebratoryAudio.currentTime = 0;
      this.celebratoryAudio.play().catch(() => undefined);
    }
    setTimeout(() => {
      this.confettiActive = false;
    }, 2500);
  }
}
