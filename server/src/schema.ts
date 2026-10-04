export const typeDefs = /* GraphQL */ `
  enum Stage {
    SITE_SURVEY
    DESIGN
    PERMITTING
    INSTALLATION
    INSPECTION
    COMPLETE
  }

  enum ProductType {
    SOLAR
    POWERWALL
    SOLAR_ROOF
    WALL_CONNECTOR
  }

  type StageEvent {
    id: ID!
    fromStage: Stage
    toStage: Stage!
    note: String
    changedAt: String!
  }

  type Job {
    id: ID!
    customerName: String!
    address: String!
    productType: ProductType!
    stage: Stage!
    assignee: String
    daysInStage: Int!
    createdAt: String!
    updatedAt: String!
    history: [StageEvent!]!
  }

  type JobPage {
    items: [Job!]!
    total: Int!
  }

  type StageCount {
    stage: Stage!
    count: Int!
  }

  input JobFilter {
    stage: Stage
    productType: ProductType
    search: String
  }

  input NewJobInput {
    customerName: String!
    address: String!
    productType: ProductType!
    assignee: String
  }

  type Query {
    jobs(filter: JobFilter, limit: Int = 20, offset: Int = 0): JobPage!
    job(id: ID!): Job
    stageSummary: [StageCount!]!
  }

  type Mutation {
    createJob(input: NewJobInput!): Job!
    advanceJob(id: ID!, note: String): Job!
    assignJob(id: ID!, assignee: String): Job!
  }
`;
