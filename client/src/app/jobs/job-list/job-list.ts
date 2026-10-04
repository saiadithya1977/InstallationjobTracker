import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, startWith, switchMap, tap } from 'rxjs';
import { Job, JobFilter, label, PRODUCT_TYPES, ProductType, Stage, STAGES } from '../job.models';
import { JobService } from '../job.service';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-job-list',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './job-list.html',
  styleUrl: './job-list.scss',
})
export class JobList implements OnInit {
  private readonly jobService = inject(JobService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly stages = STAGES;
  protected readonly productTypes = PRODUCT_TYPES;
  protected readonly label = label;

  protected readonly jobs = signal<Job[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly showCreate = signal(false);
  protected readonly saving = signal(false);

  protected readonly filters = this.fb.nonNullable.group({
    stage: '' as Stage | '',
    productType: '' as ProductType | '',
    search: '',
  });

  protected readonly createForm = this.fb.nonNullable.group({
    customerName: ['', [Validators.required, Validators.maxLength(120)]],
    address: ['', [Validators.required, Validators.maxLength(200)]],
    productType: ['SOLAR' as ProductType, Validators.required],
    assignee: [''],
  });

  ngOnInit(): void {
    // Allow deep links from the dashboard, e.g. /jobs?stage=PERMITTING
    const stage = this.route.snapshot.queryParamMap.get('stage') as Stage | null;
    if (stage && STAGES.includes(stage)) this.filters.patchValue({ stage }, { emitEvent: false });

    this.filters.valueChanges
      .pipe(
        startWith(this.filters.getRawValue()),
        debounceTime(250),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        tap((f) => {
          this.page.set(0);
          this.syncUrl(f);
        }),
        switchMap(() => this.fetch()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.fetch().subscribe();
  }

  protected get pageCount(): number {
    return Math.max(1, Math.ceil(this.total() / PAGE_SIZE));
  }

  protected clearFilters(): void {
    this.filters.reset();
  }

  protected submitJob(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.createForm.getRawValue();
    this.jobService.createJob({ ...v, assignee: v.assignee || null }).subscribe({
      next: (job) => {
        this.saving.set(false);
        this.router.navigate(['/jobs', job.id]);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not create the job. Please try again.');
      },
    });
  }

  private fetch() {
    this.loading.set(true);
    const f = this.filters.getRawValue();
    const filter: JobFilter = { stage: f.stage || null, productType: f.productType || null, search: f.search };
    return this.jobService.listJobs(filter, PAGE_SIZE, this.page() * PAGE_SIZE).pipe(
      tap({
        next: (page) => {
          this.jobs.set(page.items);
          this.total.set(page.total);
          this.error.set(null);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Could not load jobs. Is the API running?');
          this.loading.set(false);
        },
      }),
    );
  }

  private syncUrl(f: { stage?: string }): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { stage: f.stage || null },
      replaceUrl: true,
    });
  }
}
