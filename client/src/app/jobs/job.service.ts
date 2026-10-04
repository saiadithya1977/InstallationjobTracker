import { Injectable, inject } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map, Observable } from 'rxjs';
import { cleanFilter, Job, JobFilter, NewJob, StageCount } from './job.models';
import {
  ADVANCE_JOB,
  ASSIGN_JOB,
  CREATE_JOB,
  JOB_QUERY,
  JOBS_QUERY,
  STAGE_SUMMARY_QUERY,
} from './job.queries';

export interface JobPage {
  items: Job[];
  total: number;
}

/** The only place the UI talks to the GraphQL API. */
@Injectable({ providedIn: 'root' })
export class JobService {
  private readonly apollo = inject(Apollo);

  listJobs(filter: JobFilter, limit = 20, offset = 0): Observable<JobPage> {
    return this.apollo
      .query<{ jobs: JobPage }>({
        query: JOBS_QUERY,
        variables: { filter: cleanFilter(filter), limit, offset },
        fetchPolicy: 'network-only',
      })
      .pipe(map((r) => r.data!.jobs));
  }

  getJob(id: string): Observable<Job | null> {
    return this.apollo
      .query<{ job: Job | null }>({ query: JOB_QUERY, variables: { id }, fetchPolicy: 'network-only' })
      .pipe(map((r) => r.data!.job));
  }

  stageSummary(): Observable<StageCount[]> {
    return this.apollo
      .query<{ stageSummary: StageCount[] }>({ query: STAGE_SUMMARY_QUERY, fetchPolicy: 'network-only' })
      .pipe(map((r) => r.data!.stageSummary));
  }

  createJob(input: NewJob): Observable<Job> {
    return this.apollo
      .mutate<{ createJob: Job }>({ mutation: CREATE_JOB, variables: { input } })
      .pipe(map((r) => r.data!.createJob));
  }

  advanceJob(id: string, note?: string): Observable<Job> {
    return this.apollo
      .mutate<{ advanceJob: Job }>({ mutation: ADVANCE_JOB, variables: { id, note: note || null } })
      .pipe(map((r) => r.data!.advanceJob));
  }

  assignJob(id: string, assignee: string | null): Observable<Job> {
    return this.apollo
      .mutate<{ assignJob: Job }>({ mutation: ASSIGN_JOB, variables: { id, assignee } })
      .pipe(map((r) => r.data!.assignJob));
  }
}
