import { Pool, PoolConfig } from 'pg';

export class Database {
  private pool: Pool;

  constructor(config: PoolConfig) {
    this.pool = new Pool(config);
  }

  async query(text: string, params?: any[]) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }

  /**
   * Initialize database schema
   */
  async initializeSchema() {
    await this.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email_encrypted TEXT,
        phone_encrypted TEXT,
        dek_encrypted TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on username for queries
    await this.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)
    `);

    console.log('Database schema initialized');
  }
}

// Database configuration
export const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'kms_poc',
  user: process.env.DB_USER || 'poc_user',
  password: process.env.DB_PASSWORD || 'poc_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};
