import { gql } from 'apollo-angular';

const JOB_FIELDS = `
  id
  customerName
  address
  productType
  stage
  assignee
  daysInStage
  createdAt
  updatedAt
`;

export const JOBS_QUERY = gql`
  query Jobs($filter: JobFilter, $limit: Int, $offset: Int) {
    jobs(filter: $filter, limit: $limit, offset: $offset) {
      total
      items { ${JOB_FIELDS} }
    }
  }
`;

export const JOB_QUERY = gql`
  query Job($id: ID!) {
    job(id: $id) {
      ${JOB_FIELDS}
      history { id fromStage toStage note changedAt }
    }
  }
`;

export const STAGE_SUMMARY_QUERY = gql`
  query StageSummary {
    stageSummary { stage count }
  }
`;

export const CREATE_JOB = gql`
  mutation CreateJob($input: NewJobInput!) {
    createJob(input: $input) { ${JOB_FIELDS} }
  }
`;

export const ADVANCE_JOB = gql`
  mutation AdvanceJob($id: ID!, $note: String) {
    advanceJob(id: $id, note: $note) {
      ${JOB_FIELDS}
      history { id fromStage toStage note changedAt }
    }
  }
`;

export const ASSIGN_JOB = gql`
  mutation AssignJob($id: ID!, $assignee: String) {
    assignJob(id: $id, assignee: $assignee) { ${JOB_FIELDS} }
  }
`;
