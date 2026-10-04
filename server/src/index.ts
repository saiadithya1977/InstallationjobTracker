import 'dotenv/config';
import { startStandaloneServer } from '@apollo/server/standalone';
import pg from 'pg';
import { createApolloServer, createContext } from './app.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const server = createApolloServer();
const port = Number(process.env.PORT ?? 4000);

const { url } = await startStandaloneServer(server, {
  listen: { port },
  context: async () => createContext(pool),
});

console.log(`GraphQL API ready at ${url}`);
