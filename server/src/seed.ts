import 'dotenv/config';
import pg from 'pg';
import { JobRepository } from './repository.js';
import type { ProductType } from './stages.js';

const SAMPLE: { customerName: string; address: string; productType: ProductType; assignee: string; advances: number }[] = [
  { customerName: 'Ananya Rao', address: '12 Lake View Rd, Hyderabad', productType: 'SOLAR', assignee: 'Priya', advances: 0 },
  { customerName: 'Rahul Mehta', address: '44 MG Road, Bengaluru', productType: 'POWERWALL', assignee: 'Arjun', advances: 1 },
  { customerName: 'Kavya Iyer', address: '7 Beach Rd, Chennai', productType: 'SOLAR_ROOF', assignee: 'Priya', advances: 2 },
  { customerName: 'Vikram Singh', address: '90 Ring Rd, Pune', productType: 'SOLAR', assignee: 'Meera', advances: 3 },
  { customerName: 'Sneha Reddy', address: '3 Hill St, Warangal', productType: 'WALL_CONNECTOR', assignee: 'Arjun', advances: 4 },
  { customerName: 'Arnav Gupta', address: '18 Park Ave, Delhi', productType: 'POWERWALL', assignee: 'Meera', advances: 5 },
  { customerName: 'Ishita Das', address: '61 Lake Town, Kolkata', productType: 'SOLAR', assignee: 'Priya', advances: 2 },
  { customerName: 'Rohan Nair', address: '25 Marine Dr, Kochi', productType: 'SOLAR_ROOF', assignee: 'Arjun', advances: 1 },
];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const repo = new JobRepository(pool);
for (const s of SAMPLE) {
  const job = await repo.create(s);
  for (let i = 0; i < s.advances; i++) await repo.advance(job.id, 'Seeded progress');
}
console.log(`Seeded ${SAMPLE.length} jobs`);
await pool.end();
