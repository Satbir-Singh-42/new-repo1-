import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Initialize database if DATABASE_URL is provided
let db: any = null;
let pool: any = null;

function getDatabaseUrl(): string | null {
  let databaseUrl = process.env.DATABASE_URL;
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
      pool = new Pool({ 
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : false
      });
      db = drizzle(pool, { schema });
      
      // Test the connection
      await pool.query('SELECT 1');
      console.log('Database connected successfully');
      return true;
    } catch (error) {
      console.warn('Database connection failed, using memory storage:', error instanceof Error ? error.message : String(error));
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