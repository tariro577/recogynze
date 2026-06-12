import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AssistantMessage } from '../models';

@Injectable({ providedIn: 'root' })
export class AssistantService {
  constructor(private api: ApiService) {}

  /** Sends the chat history (ending with the user's question) and returns the reply. */
  ask(messages: AssistantMessage[]): Observable<string> {
    return this.api
      .post<{ reply: string }>('/assistant', { messages })
      .pipe(map(response => response.reply));
  }
}
