// Stage workflow rules, kept free of I/O so they are easy to unit test.

export const STAGES = [
  'SITE_SURVEY',
  'DESIGN',
  'PERMITTING',
  'INSTALLATION',
  'INSPECTION',
  'COMPLETE',
] as const;

export type Stage = (typeof STAGES)[number];

export const PRODUCT_TYPES = ['SOLAR', 'POWERWALL', 'SOLAR_ROOF', 'WALL_CONNECTOR'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export class WorkflowError extends Error {}

/** Returns the stage that follows `current`, or throws if the job is already complete. */
export function nextStage(current: Stage): Stage {
  const index = STAGES.indexOf(current);
  if (index === -1) throw new WorkflowError(`Unknown stage: ${current}`);
  if (index === STAGES.length - 1) throw new WorkflowError('Job is already complete');
  return STAGES[index + 1];
}

/** Whole days a job has spent in its current stage. */
export function daysInStage(stageEnteredAt: Date, now: Date = new Date()): number {
  const ms = now.getTime() - stageEnteredAt.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}
