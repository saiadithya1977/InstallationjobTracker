import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';
import { JobService } from './job.service';
import { ADVANCE_JOB, JOBS_QUERY } from './job.queries';

describe('JobService', () => {
  let service: JobService;
  let controller: ApolloTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ApolloTestingModule] });
    service = TestBed.inject(JobService);
    controller = TestBed.inject(ApolloTestingController);
  });

  afterEach(() => controller.verify());

  it('sends only the filters that are set and returns the page', async () => {
    const result = firstValueFrom(service.listJobs({ stage: 'DESIGN', productType: null, search: '' }, 10, 20));

    const op = controller.expectOne(JOBS_QUERY);
    expect(op.operation.variables).toEqual({ filter: { stage: 'DESIGN' }, limit: 10, offset: 20 });
    op.flush({ data: { jobs: { total: 0, items: [] } } });

    expect(await result).toEqual({ total: 0, items: [] });
  });

  it('passes a null note when advancing without one', () => {
    service.advanceJob('7', '').subscribe();
    const op = controller.expectOne(ADVANCE_JOB);
    expect(op.operation.variables).toEqual({ id: '7', note: null });
    op.flush({ data: { advanceJob: { id: '7', stage: 'DESIGN', history: [] } } });
  });
});
