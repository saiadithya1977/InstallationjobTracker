import type { Pool, PoolClient } from 'pg';
import { nextStage, type ProductType, type Stage, WorkflowError } from './stages.js';

export interface JobRow {
  id: number;
  customer_name: string;
  address: string;
  product_type: ProductType;
  stage: Stage;
  assignee: string | null;
  stage_entered_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface StageEventRow {
  id: number;
  job_id: number;
  from_stage: Stage | null;
  to_stage: Stage;
  note: string | null;
  changed_at: Date;
}

export interface JobFilter {
  stage?: Stage | null;
  productType?: ProductType | null;
  search?: string | null;
}

export interface NewJob {
  customerName: string;
  address: string;
  productType: ProductType;
  assignee?: string | null;
}

/** Data access for jobs. All SQL is parameterized. */
export class JobRepository {
  constructor(private readonly pool: Pool) {}

  async list(filter: JobFilter = {}, limit = 20, offset = 0): Promise<{ items: JobRow[]; total: number }> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filter.stage) {
      params.push(filter.stage);
      where.push(`stage = $${params.length}`);
    }
    if (filter.productType) {
      params.push(filter.productType);
      where.push(`product_type = $${params.length}`);
    }
    if (filter.search?.trim()) {
      params.push(`%${filter.search.trim()}%`);
      where.push(`(customer_name ILIKE $${params.length} OR address ILIKE $${params.length})`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = await this.pool.query<{ count: string }>(`SELECT count(*) FROM jobs ${whereSql}`, params);
    const page = await this.pool.query<JobRow>(
      `SELECT * FROM jobs ${whereSql} ORDER BY updated_at DESC, id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Math.min(Math.max(limit, 1), 100), Math.max(offset, 0)],
    );
    return { items: page.rows, total: Number(total.rows[0].count) };
  }

  async findById(id: number): Promise<JobRow | null> {
    const { rows } = await this.pool.query<JobRow>('SELECT * FROM jobs WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async history(jobIds: readonly number[]): Promise<StageEventRow[]> {
    const { rows } = await this.pool.query<StageEventRow>(
      'SELECT * FROM stage_events WHERE job_id = ANY($1) ORDER BY changed_at, id',
      [jobIds],
    );
    return rows;
  }

  async stageSummary(): Promise<{ stage: Stage; count: number }[]> {
    const { rows } = await this.pool.query<{ stage: Stage; count: string }>(
      'SELECT stage, count(*) FROM jobs GROUP BY stage',
    );
    return rows.map((r) => ({ stage: r.stage, count: Number(r.count) }));
  }

  async create(input: NewJob): Promise<JobRow> {
    return this.inTransaction(async (client) => {
      const { rows } = await client.query<JobRow>(
        `INSERT INTO jobs (customer_name, address, product_type, assignee)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [input.customerName.trim(), input.address.trim(), input.productType, input.assignee ?? null],
      );
      const job = rows[0];
      await client.query(
        'INSERT INTO stage_events (job_id, from_stage, to_stage, note) VALUES ($1, NULL, $2, $3)',
        [job.id, job.stage, 'Job created'],
      );
      return job;
    });
  }

  /** Moves a job to its next stage and records the change, atomically. */
  async advance(id: number, note?: string | null): Promise<JobRow> {
    return this.inTransaction(async (client) => {
      // Lock the row so two people advancing the same job cannot skip a stage.
      const { rows } = await client.query<JobRow>('SELECT * FROM jobs WHERE id = $1 FOR UPDATE', [id]);
      const job = rows[0];
      if (!job) throw new WorkflowError(`Job ${id} not found`);

      const to = nextStage(job.stage);
      const updated = await client.query<JobRow>(
        `UPDATE jobs SET stage = $2, stage_entered_at = now(), updated_at = now()
         WHERE id = $1 RETURNING *`,
        [id, to],
      );
      await client.query(
        'INSERT INTO stage_events (job_id, from_stage, to_stage, note) VALUES ($1, $2, $3, $4)',
        [id, job.stage, to, note?.trim() || null],
      );
      return updated.rows[0];
    });
  }

  async assign(id: number, assignee: string | null): Promise<JobRow> {
    const { rows } = await this.pool.query<JobRow>(
      'UPDATE jobs SET assignee = $2, updated_at = now() WHERE id = $1 RETURNING *',
      [id, assignee?.trim() || null],
    );
    if (!rows[0]) throw new WorkflowError(`Job ${id} not found`);
    return rows[0];
  }

  private async inTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
