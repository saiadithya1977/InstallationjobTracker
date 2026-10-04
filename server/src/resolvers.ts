import { GraphQLError } from 'graphql';
import type { JobRepository, JobRow, StageEventRow } from './repository.js';
import { daysInStage, STAGES, WorkflowError } from './stages.js';

export interface Context {
  repo: JobRepository;
  /** Batches history lookups so a list of N jobs costs one query, not N. */
  historyLoader: (jobId: number) => Promise<StageEventRow[]>;
}

export function createHistoryLoader(repo: JobRepository) {
  let pending: { id: number; resolve: (rows: StageEventRow[]) => void; reject: (e: unknown) => void }[] = [];
  return (jobId: number) =>
    new Promise<StageEventRow[]>((resolve, reject) => {
      pending.push({ id: jobId, resolve, reject });
      if (pending.length === 1) {
        queueMicrotask(async () => {
          const batch = pending;
          pending = [];
          try {
            const rows = await repo.history([...new Set(batch.map((b) => b.id))]);
            for (const b of batch) b.resolve(rows.filter((r) => r.job_id === b.id));
          } catch (e) {
            for (const b of batch) b.reject(e);
          }
        });
      }
    });
}

function toId(id: string): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new GraphQLError('Invalid job id', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return n;
}

async function guard<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (e) {
    if (e instanceof WorkflowError) {
      throw new GraphQLError(e.message, { extensions: { code: 'BAD_USER_INPUT' } });
    }
    throw e;
  }
}

export const resolvers = {
  Query: {
    jobs: (_: unknown, args: { filter?: object; limit: number; offset: number }, ctx: Context) =>
      ctx.repo.list(args.filter ?? {}, args.limit, args.offset),
    job: (_: unknown, args: { id: string }, ctx: Context) => ctx.repo.findById(toId(args.id)),
    stageSummary: async (_: unknown, __: unknown, ctx: Context) => {
      const counts = new Map((await ctx.repo.stageSummary()).map((c) => [c.stage, c.count]));
      // Always return every stage, in workflow order, so the UI can render an empty pipeline.
      return STAGES.map((stage) => ({ stage, count: counts.get(stage) ?? 0 }));
    },
  },

  Mutation: {
    createJob: (_: unknown, { input }: { input: { customerName: string; address: string; productType: never; assignee?: string } }, ctx: Context) =>
      guard(() => {
        if (!input.customerName.trim() || !input.address.trim()) {
          throw new WorkflowError('Customer name and address are required');
        }
        return ctx.repo.create(input);
      }),
    advanceJob: (_: unknown, args: { id: string; note?: string }, ctx: Context) =>
      guard(() => ctx.repo.advance(toId(args.id), args.note)),
    assignJob: (_: unknown, args: { id: string; assignee?: string }, ctx: Context) =>
      guard(() => ctx.repo.assign(toId(args.id), args.assignee ?? null)),
  },

  Job: {
    customerName: (j: JobRow) => j.customer_name,
    productType: (j: JobRow) => j.product_type,
    daysInStage: (j: JobRow) => daysInStage(new Date(j.stage_entered_at)),
    createdAt: (j: JobRow) => new Date(j.created_at).toISOString(),
    updatedAt: (j: JobRow) => new Date(j.updated_at).toISOString(),
    history: (j: JobRow, _: unknown, ctx: Context) => ctx.historyLoader(j.id),
  },

  StageEvent: {
    fromStage: (e: StageEventRow) => e.from_stage,
    toStage: (e: StageEventRow) => e.to_stage,
    changedAt: (e: StageEventRow) => new Date(e.changed_at).toISOString(),
  },
};
