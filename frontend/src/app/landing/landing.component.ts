import { Component, OnInit } from '@angular/core';
import { RecognitionService } from '../shared/services/recognition.service';
import { RecognitionStats } from '../shared/models';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit {
  stats: RecognitionStats | null = null;
  loading = true;

  constructor(private recognitionService: RecognitionService) {}

  ngOnInit(): void {
    this.recognitionService.getStats().subscribe({
      next: (stats: RecognitionStats) => {
        this.stats = stats;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
