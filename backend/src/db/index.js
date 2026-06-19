// src/db/index.js
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js'; // Import your tables
import dotenv from 'dotenv';

dotenv.config();

// 1. Create a Connection Pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, 
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 2. Initialize Drizzle with the Pool
export const db = drizzle(pool, { schema });

// 3. Optional: Test connection on startup
pool.connect()
  .then(client => {
    console.log("Database Connected Successfully");
    client.release(); // Release client back to pool
  })
  .catch(err => {
    console.error(" Database Connection Failed:", err.message);
    process.exit(1); // Stop app if DB is dead
  });