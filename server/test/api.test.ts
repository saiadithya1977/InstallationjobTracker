// Integration tests: real GraphQL operations against a real PostgreSQL database.
// Requires TEST_DATABASE_URL pointing at a disposable database.
import pg from 'pg';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApolloServer, createContext } from '../src/app.js';
import { resetSchema } from '../src/migrate.js';

const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
const server = createApolloServer();

async function run(query: string, variables: Record<string, unknown> = {}) {
  const res = await server.executeOperation({ query, variables }, { contextValue: createContext(pool) });
  if (res.body.kind !== 'single') throw new Error('Expected single result');
  return res.body.singleResult;
}

const CREATE = `mutation ($input: NewJobInput!) { createJob(input: $input) { id stage history { toStage } } }`;
const ADVANCE = `mutation ($id: ID!, $note: String) { advanceJob(id: $id, note: $note) { stage history { fromStage toStage note } } }`;

async function createJob(overrides: Record<string, unknown> = {}) {
  const r = await run(CREATE, {
    input: { customerName: 'Test Customer', address: '1 Test St', productType: 'SOLAR', ...overrides },
  });
  return (r.data as any).createJob;
}

beforeEach(async () => {
  await resetSchema(pool);
});

afterAll(async () => {
  await pool.end();
});

describe('jobs API', () => {
  it('creates a job at SITE_SURVEY with a history entry', async () => {
    const job = await createJob();
    expect(job.stage).toBe('SITE_SURVEY');
    expect(job.history).toEqual([{ toStage: 'SITE_SURVEY' }]);
  });

  it('advances a job one stage and records the transition', async () => {
    const job = await createJob();
    const r = await run(ADVANCE, { id: job.id, note: 'Survey done' });
    const advanced = (r.data as any).advanceJob;
    expect(advanced.stage).toBe('DESIGN');
    expect(advanced.history.at(-1)).toEqual({ fromStage: 'SITE_SURVEY', toStage: 'DESIGN', note: 'Survey done' });
  });

  it('rejects advancing a completed job', async () => {
    const job = await createJob();
    for (let i = 0; i < 5; i++) await run(ADVANCE, { id: job.id });
    const r = await run(ADVANCE, { id: job.id });
    expect(r.errors?.[0].message).toBe('Job is already complete');
    expect(r.errors?.[0].extensions?.code).toBe('BAD_USER_INPUT');
  });

  it('never skips a stage when advanced concurrently', async () => {
    const job = await createJob();
    await Promise.all([run(ADVANCE, { id: job.id }), run(ADVANCE, { id: job.id })]);
    const r = await run(`query ($id: ID!) { job(id: $id) { stage history { fromStage toStage } } }`, { id: job.id });
    const { stage, history } = (r.data as any).job;
    expect(stage).toBe('PERMITTING');
    expect(history.map((h: any) => h.toStage)).toEqual(['SITE_SURVEY', 'DESIGN', 'PERMITTING']);
  });

  it('filters by stage, product type and search text', async () => {
    const a = await createJob({ customerName: 'Ananya Rao', productType: 'POWERWALL' });
    await createJob({ customerName: 'Rahul Mehta', productType: 'SOLAR' });
    await run(ADVANCE, { id: a.id });

    const q = `query ($f: JobFilter) { jobs(filter: $f) { total items { customerName } } }`;
    expect(((await run(q, { f: { stage: 'DESIGN' } })).data as any).jobs.items).toEqual([{ customerName: 'Ananya Rao' }]);
    expect(((await run(q, { f: { productType: 'SOLAR' } })).data as any).jobs.total).toBe(1);
    expect(((await run(q, { f: { search: 'mehta' } })).data as any).jobs.items).toEqual([{ customerName: 'Rahul Mehta' }]);
  });

  it('returns every stage in the summary, including empty ones', async () => {
    await createJob();
    const r = await run(`{ stageSummary { stage count } }`);
    const summary = (r.data as any).stageSummary;
    expect(summary).toHaveLength(6);
    expect(summary[0]).toEqual({ stage: 'SITE_SURVEY', count: 1 });
    expect(summary[5]).toEqual({ stage: 'COMPLETE', count: 0 });
  });

  it('validates required fields', async () => {
    const r = await run(CREATE, { input: { customerName: '  ', address: 'x', productType: 'SOLAR' } });
    expect(r.errors?.[0].extensions?.code).toBe('BAD_USER_INPUT');
  });
});
