import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Job, label, STAGES, stageProgress } from '../job.models';
import { JobService } from '../job.service';

@Component({
  selector: 'app-job-detail',
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './job-detail.html',
  styleUrl: './job-detail.scss',
})
export class JobDetail implements OnInit {
  private readonly jobService = inject(JobService);

  /** Bound from the :id route parameter. */
  readonly id = input.required<string>();

  protected readonly job = signal<Job | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected note = '';
  protected assignee = '';

  protected readonly stages = STAGES;
  protected readonly label = label;
  protected readonly progress = computed(() => (this.job() ? stageProgress(this.job()!.stage) : 0));
  protected readonly isComplete = computed(() => this.job()?.stage === 'COMPLETE');

  ngOnInit(): void {
    this.jobService.getJob(this.id()).subscribe({
      next: (job) => {
        this.setJob(job);
        this.loading.set(false);
        if (!job) this.error.set('Job not found.');
      },
      error: () => {
        this.error.set('Could not load this job.');
        this.loading.set(false);
      },
    });
  }

  protected stageState(stage: string): 'done' | 'current' | 'upcoming' {
    const current = STAGES.indexOf(this.job()!.stage);
    const index = STAGES.indexOf(stage as (typeof STAGES)[number]);
    return index < current ? 'done' : index === current ? 'current' : 'upcoming';
  }

  protected advance(): void {
    this.busy.set(true);
    this.jobService.advanceJob(this.id(), this.note.trim()).subscribe({
      next: (job) => {
        this.setJob(job);
        this.note = '';
        this.busy.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message || 'Could not advance this job.');
        this.busy.set(false);
      },
    });
  }

  protected saveAssignee(): void {
    this.busy.set(true);
    this.jobService.assignJob(this.id(), this.assignee.trim() || null).subscribe({
      next: (job) => {
        this.job.update((current) => (current ? { ...current, assignee: job.assignee } : current));
        this.busy.set(false);
      },
      error: () => {
        this.error.set('Could not update the assignee.');
        this.busy.set(false);
      },
    });
  }

  private setJob(job: Job | null): void {
    this.job.set(job);
    this.assignee = job?.assignee ?? '';
    this.error.set(null);
  }
}
