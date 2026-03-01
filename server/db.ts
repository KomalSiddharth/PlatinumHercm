import pkg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20,                       // max 20 concurrent DB connections
  idleTimeoutMillis: 30000,      // close idle connections after 30s
  connectionTimeoutMillis: 5000, // timeout if no connection available in 5s
});

export const db = drizzle(pool, { schema });
export { pool };
