import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Pipeline',
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'jobs',
    title: 'Jobs',
    loadComponent: () => import('./jobs/job-list/job-list').then((m) => m.JobList),
  },
  {
    path: 'jobs/:id',
    title: 'Job details',
    loadComponent: () => import('./jobs/job-detail/job-detail').then((m) => m.JobDetail),
  },
  { path: '**', redirectTo: '' },
];
