import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient, private authService: AuthService) {}

  get<T>(path: string, params?: Record<string, string | number | undefined>): Observable<T> {
    return this.http.get<T>(`${environment.apiBaseUrl}${path}`, {
      headers: this.buildHeaders(),
      params: this.buildParams(params)
    });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${environment.apiBaseUrl}${path}`, body, { headers: this.buildHeaders() });
  }

  // Identity travels as headers (from the Teams context) instead of an OAuth token.
  // The display name is URI-encoded: HTTP headers only allow ISO-8859-1, so a
  // name with characters outside that range would otherwise break every request.
  private buildHeaders(): HttpHeaders {
    const profile = this.authService.currentProfile();
    return new HttpHeaders({
      'X-User-Email': profile.email,
      'X-User-Name': encodeURIComponent(profile.displayName || '')
    });
  }

  private buildParams(params?: Record<string, string | number | undefined>): HttpParams | undefined {
    if (!params) {
      return undefined;
    }
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return httpParams;
  }
}
