// PostgreSQL connection pool for indexer database
import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let connectionAttempted = false;

export async function initDatabase(): Promise<boolean> {
  if (!config.indexerDbUrl) {
    console.log('No INDEXER_DB_URL configured, will use RPC fallback');
    return false;
  }

  if (connectionAttempted) {
    return pool !== null;
  }

  connectionAttempted = true;

  try {
    pool = new Pool({
      connectionString: config.indexerDbUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    console.log('Connected to indexer database');
    return true;
  } catch (error) {
    console.error('Failed to connect to indexer database:', error);
    pool = null;
    return false;
  }
}

export function getPool(): pg.Pool | null {
  return pool;
}

export function isIndexerAvailable(): boolean {
  return pool !== null;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
