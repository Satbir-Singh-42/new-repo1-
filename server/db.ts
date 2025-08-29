import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize database if DATABASE_URL is provided
let db: any = null;
let pool: any = null;

function getDatabaseUrl(): string | null {
  // Use the specific database URL provided
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    console.log('Found DATABASE_URL:', databaseUrl.substring(0, 60) + '...');
    return databaseUrl;
  }
  console.log('DATABASE_URL not found in environment');
  return null;
}

async function initializeDatabase() {
  const databaseUrl = getDatabaseUrl();
  
  if (databaseUrl) {
    console.log('Using DATABASE_URL:', databaseUrl.substring(0, 50) + '...');
    try {
      neonConfig.webSocketConstructor = ws;
      pool = new Pool({ connectionString: databaseUrl });
      db = drizzle({ client: pool, schema });
      
      // Test the connection
      await pool.query('SELECT 1');
      console.log('Database connected successfully');
      return true;
    } catch (error) {
      console.warn('Database connection failed, falling back to memory storage:', error);
      db = null;
      pool = null;
      return false;
    }
  } else {
    console.log('No DATABASE_URL found, using memory storage');
    return false;
  }
}

// Initialize database connection but don't block the app if it fails
initializeDatabase().catch(console.error);

export { pool, db, initializeDatabase };