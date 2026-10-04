import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { label, StageCount } from '../jobs/job.models';
import { JobService } from '../jobs/job.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly jobs = inject(JobService);

  protected readonly summary = signal<StageCount[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly total = computed(() => this.summary().reduce((sum, s) => sum + s.count, 0));
  protected readonly active = computed(() =>
    this.summary().filter((s) => s.stage !== 'COMPLETE').reduce((sum, s) => sum + s.count, 0),
  );
  protected readonly label = label;

  ngOnInit(): void {
    this.jobs.stageSummary().subscribe({
      next: (s) => {
        this.summary.set(s);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load the pipeline. Is the API running?');
        this.loading.set(false);
      },
    });
  }

  /** Bar width relative to the busiest stage, so the bottleneck stands out. */
  protected barWidth(count: number): number {
    const max = Math.max(...this.summary().map((s) => s.count), 1);
    return Math.round((count / max) * 100);
  }
}
