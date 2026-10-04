import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

/** Drops and recreates the schema. Development use only. */
export async function resetSchema(pool: pg.Pool) {
  const sql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  await pool.query('DROP TABLE IF EXISTS stage_events, jobs; DROP TYPE IF EXISTS job_stage, product_type;');
  await pool.query(sql);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  await resetSchema(pool);
  console.log('Schema created');
  await pool.end();
}
