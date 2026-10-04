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

export interface StageEvent {
  id: string;
  fromStage: Stage | null;
  toStage: Stage;
  note: string | null;
  changedAt: string;
}

export interface Job {
  id: string;
  customerName: string;
  address: string;
  productType: ProductType;
  stage: Stage;
  assignee: string | null;
  daysInStage: number;
  createdAt: string;
  updatedAt: string;
  history?: StageEvent[];
}

export interface JobFilter {
  stage?: Stage | null;
  productType?: ProductType | null;
  search?: string | null;
}

export interface StageCount {
  stage: Stage;
  count: number;
}

export interface NewJob {
  customerName: string;
  address: string;
  productType: ProductType;
  assignee?: string | null;
}

/** Turns an enum value like SOLAR_ROOF into "Solar Roof". */
export function label(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

/** Index of a stage in the workflow, used to draw progress. */
export function stageProgress(stage: Stage): number {
  return Math.round((STAGES.indexOf(stage) / (STAGES.length - 1)) * 100);
}

/** Drops empty values so the API only receives filters the user actually set. */
export function cleanFilter(filter: JobFilter): JobFilter {
  const out: JobFilter = {};
  if (filter.stage) out.stage = filter.stage;
  if (filter.productType) out.productType = filter.productType;
  if (filter.search?.trim()) out.search = filter.search.trim();
  return out;
}
