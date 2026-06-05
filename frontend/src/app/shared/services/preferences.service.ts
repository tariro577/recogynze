import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly storageKey = 'recognyze-sound';
  private soundEnabledSubject = new BehaviorSubject<boolean>(this.getInitialValue());
  soundEnabled$ = this.soundEnabledSubject.asObservable();

  setSound(enabled: boolean): void {
    this.soundEnabledSubject.next(enabled);
    localStorage.setItem(this.storageKey, String(enabled));
  }

  private getInitialValue(): boolean {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? stored === 'true' : true;
  }
}
