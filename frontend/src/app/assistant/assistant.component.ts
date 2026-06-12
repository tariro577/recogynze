import { AfterViewChecked, Component, ElementRef, ViewChild } from '@angular/core';
import { AssistantService } from '../shared/services/assistant.service';
import { AssistantMessage } from '../shared/models';

const GREETING: AssistantMessage = {
  role: 'assistant',
  content:
    'Hi! I\'m the Recognyze assistant. Ask me anything about the app — for example "How do I give a recognition?" or "What do the badges mean?"',
  isLocal: true
};

const SUGGESTIONS = [
  'How do I give a recognition?',
  'What do the badges mean?',
  'How does the leaderboard work?'
];

@Component({
  selector: 'app-assistant',
  templateUrl: './assistant.component.html',
  styleUrls: ['./assistant.component.css']
})
export class AssistantComponent implements AfterViewChecked {
  open = false;
  sending = false;
  draft = '';
  messages: AssistantMessage[] = [GREETING];
  suggestions = SUGGESTIONS;

  @ViewChild('thread') private thread?: ElementRef<HTMLDivElement>;
  private shouldScroll = false;

  constructor(private assistantService: AssistantService) {}

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.thread) {
      this.thread.nativeElement.scrollTop = this.thread.nativeElement.scrollHeight;
      this.shouldScroll = false;
    }
  }

  toggle(): void {
    this.open = !this.open;
    if (this.open) {
      this.shouldScroll = true;
    }
  }

  ask(question: string): void {
    this.draft = question;
    this.send();
  }

  send(): void {
    const question = this.draft.trim();
    if (!question || this.sending) {
      return;
    }
    this.messages = [...this.messages, { role: 'user', content: question }];
    this.draft = '';
    this.sending = true;
    this.shouldScroll = true;

    // Send only the real conversation — not the canned greeting or locally
    // generated error bubbles, which the model never actually said.
    const history = this.messages
      .filter(m => !m.isLocal)
      .map(m => ({ role: m.role, content: m.content }));
    this.assistantService.ask(history).subscribe({
      next: (reply: string) => {
        this.messages = [...this.messages, { role: 'assistant', content: reply }];
        this.sending = false;
        this.shouldScroll = true;
      },
      error: (err: { error?: { message?: string } }) => {
        this.messages = [
          ...this.messages,
          {
            role: 'assistant',
            content:
              err?.error?.message || 'Sorry, I could not reach the assistant. Please try again in a moment.',
            isLocal: true
          }
        ];
        this.sending = false;
        this.shouldScroll = true;
      }
    });
  }
}
