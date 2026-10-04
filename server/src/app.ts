import { ApolloServer } from '@apollo/server';
import type { Pool } from 'pg';
import { JobRepository } from './repository.js';
import { createHistoryLoader, resolvers, type Context } from './resolvers.js';
import { typeDefs } from './schema.js';

export function createApolloServer() {
  return new ApolloServer<Context>({ typeDefs, resolvers });
}

/** Builds a fresh per-request context; the history loader must not be shared across requests. */
export function createContext(pool: Pool): Context {
  const repo = new JobRepository(pool);
  return { repo, historyLoader: createHistoryLoader(repo) };
}
