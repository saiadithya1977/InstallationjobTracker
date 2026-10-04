# Installation Job Tracker

An internal tool for tracking energy-product installation jobs (solar, home batteries, solar roofs, wall
connectors) from site survey to completion. Teams can see where every job sits in the pipeline, spot jobs
stuck in a stage, move jobs forward with a note, and audit each job's full history.

**Stack:** Angular 21 (standalone components, signals) · Apollo Angular · GraphQL (Apollo Server) ·
Node.js · TypeScript · PostgreSQL · Vitest

## Features

- **Pipeline dashboard:** job counts per stage, with bars scaled to the busiest stage so bottlenecks stand out.
  Each stage links to a filtered job list.
- **Job list:** search by customer or address, filter by stage and product, server-side pagination.
  Jobs sitting in one stage for 7+ days are highlighted.
- **Job detail:** stage progress tracker, one-click "move to next stage" with an optional note, assignee
  editing, and a timeline of every stage change.
- **Enforced workflow:** stages can only move forward one step at a time:
  `SITE_SURVEY → DESIGN → PERMITTING → INSTALLATION → INSPECTION → COMPLETE`.

## Architecture

```
Angular app ──GraphQL over HTTP──▶ Apollo Server ──▶ JobRepository ──SQL──▶ PostgreSQL
 (client/)                          (server/src)       (parameterized)       jobs, stage_events
```

| Layer | Where | Notes |
| --- | --- | --- |
| UI | `client/src/app` | Lazy-loaded routes; `JobService` is the only class that talks to the API |
| API schema | `server/src/schema.ts` | Queries: `jobs`, `job`, `stageSummary`. Mutations: `createJob`, `advanceJob`, `assignJob` |
| Business rules | `server/src/stages.ts` | Pure functions for stage order, unit tested in isolation |
| Data access | `server/src/repository.ts` | All SQL is parameterized; writes run in transactions |
| Database | `server/db/schema.sql` | Enum types for stages and products, indexes on common filters |

### Design decisions

- **Stage changes are atomic and race-safe.** `advanceJob` locks the job row (`SELECT … FOR UPDATE`),
  updates the stage and writes a `stage_events` row in a single transaction. Two people clicking
  "advance" at the same moment move the job two steps in order; it can never skip a stage or lose an
  audit entry. An integration test covers this.
- **No N+1 queries.** A job list asking for `history` is resolved with one batched query, not one per job.
- **Validation errors are typed.** Workflow violations (advancing a completed job, empty required fields)
  return GraphQL errors with code `BAD_USER_INPUT`, which the UI shows to the user.
- **`stageSummary` always returns all six stages** in workflow order, so the dashboard renders an empty
  pipeline correctly.

## Running locally

Requirements: Node.js 22+, and Docker (or a local PostgreSQL 16).

```bash
# 1. Database
docker compose up -d

# 2. API (http://localhost:4000)
cd server
npm install
cp .env.example .env
npm run db:reset && npm run db:seed
npm run dev

# 3. Web app (http://localhost:4200)
cd ../client
npm install
npm start
```

## Tests

```bash
# API: unit tests for workflow rules + integration tests against a real PostgreSQL database
cd server
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/jobtracker_test npm test

# Web app: component and service tests (Vitest + Angular TestBed + Apollo testing controller)
cd client
npm test -- --watch=false
```

## Example query

```graphql
query {
  jobs(filter: { stage: PERMITTING }, limit: 5) {
    total
    items { customerName productType daysInStage history { fromStage toStage note changedAt } }
  }
}
```
