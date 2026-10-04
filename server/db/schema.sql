-- Installation Job Tracker schema (PostgreSQL)

CREATE TYPE job_stage AS ENUM (
  'SITE_SURVEY', 'DESIGN', 'PERMITTING', 'INSTALLATION', 'INSPECTION', 'COMPLETE'
);

CREATE TYPE product_type AS ENUM ('SOLAR', 'POWERWALL', 'SOLAR_ROOF', 'WALL_CONNECTOR');

CREATE TABLE jobs (
  id               SERIAL PRIMARY KEY,
  customer_name    TEXT         NOT NULL,
  address          TEXT         NOT NULL,
  product_type     product_type NOT NULL,
  stage            job_stage    NOT NULL DEFAULT 'SITE_SURVEY',
  assignee         TEXT,
  stage_entered_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Every stage change is recorded so a job's full history can be audited.
CREATE TABLE stage_events (
  id          SERIAL PRIMARY KEY,
  job_id      INTEGER     NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  from_stage  job_stage,
  to_stage    job_stage   NOT NULL,
  note        TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_stage ON jobs(stage);
CREATE INDEX idx_jobs_product_type ON jobs(product_type);
CREATE INDEX idx_stage_events_job ON stage_events(job_id, changed_at);
