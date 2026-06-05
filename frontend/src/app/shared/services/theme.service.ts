import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'recognyze-theme';
  private modeSubject = new BehaviorSubject<ThemeMode>(this.getInitialMode());
  mode$ = this.modeSubject.asObservable();

  constructor() {
    this.setMode(this.modeSubject.value);
  }

  toggle(): void {
    const nextMode: ThemeMode = this.modeSubject.value === 'light' ? 'dark' : 'light';
    this.setMode(nextMode);
  }

  setMode(mode: ThemeMode): void {
    this.modeSubject.next(mode);
    localStorage.setItem(this.storageKey, mode);
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${mode}`);
  }

  private getInitialMode(): ThemeMode {
    const savedMode = localStorage.getItem(this.storageKey) as ThemeMode | null;
    return savedMode ?? 'light';
  }
}
