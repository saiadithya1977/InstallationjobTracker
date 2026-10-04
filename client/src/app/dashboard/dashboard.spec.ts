import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { JobService } from '../jobs/job.service';
import { Dashboard } from './dashboard';

function setup(service: Partial<JobService>) {
  TestBed.configureTestingModule({
    imports: [Dashboard],
    providers: [provideRouter([]), { provide: JobService, useValue: service }],
  });
  const fixture = TestBed.createComponent(Dashboard);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('Dashboard', () => {
  it('renders one row per stage with totals', () => {
    const el = setup({
      stageSummary: () =>
        of([
          { stage: 'SITE_SURVEY', count: 2 },
          { stage: 'DESIGN', count: 1 },
          { stage: 'PERMITTING', count: 0 },
          { stage: 'INSTALLATION', count: 0 },
          { stage: 'INSPECTION', count: 0 },
          { stage: 'COMPLETE', count: 3 },
        ]),
    });

    const counts = [...el.querySelectorAll('[data-testid="stage-count"]')].map((n) => n.textContent?.trim());
    expect(counts).toEqual(['2', '1', '0', '0', '0', '3']);
    expect(el.textContent).toContain('Site Survey');
    expect(el.querySelector('.stats')?.textContent).toContain('6'); // total
    expect(el.querySelector('.stats')?.textContent).toContain('3'); // in progress
  });

  it('shows an error when the API is unreachable', () => {
    const el = setup({ stageSummary: () => throwError(() => new Error('offline')) });
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Could not load the pipeline');
  });
});
