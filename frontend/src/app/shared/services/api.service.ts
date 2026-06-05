import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient, private authService: AuthService) {}

  get<T>(path: string, params?: Record<string, string | number | undefined>): Observable<T> {
    return from(this.buildHeaders()).pipe(
      switchMap((headers: HttpHeaders) =>
        this.http.get<T>(`${environment.apiBaseUrl}${path}`, { headers, params: this.buildParams(params) })
      )
    );
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return from(this.buildHeaders()).pipe(
      switchMap((headers: HttpHeaders) => this.http.post<T>(`${environment.apiBaseUrl}${path}`, body, { headers }))
    );
  }

  private async buildHeaders(): Promise<HttpHeaders> {
    const token = await this.authService.getAccessToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
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
