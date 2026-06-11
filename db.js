const { randomUUID } = require("crypto");
const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";
let pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : undefined
  });
} else {
  if (isProduction) {
    throw new Error("DATABASE_URL is required in production.");
  }

  const { newDb } = require("pg-mem");
  const memoryDb = newDb();
  memoryDb.public.registerFunction({
    name: "gen_random_uuid",
    returns: "uuid",
    implementation: randomUUID,
    impure: true
  });
  const adapter = memoryDb.adapters.createPg();
  pool = new adapter.Pool();
  console.warn("DATABASE_URL is not set. Using an in-memory database for local development.");
}

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(80) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      age INTEGER CHECK (age BETWEEN 1 AND 120),
      role VARCHAR(16) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash CHAR(64) NOT NULL UNIQUE,
      ip_address VARCHAR(80),
      user_agent TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS project_likes (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, project_id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      actor_email VARCHAR(255),
      action VARCHAR(80) NOT NULL,
      target_type VARCHAR(80),
      target_id VARCHAR(255),
      detail JSONB NOT NULL DEFAULT '{}'::jsonb,
      ip_address VARCHAR(80),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
  `);
}

module.exports = { pool, migrate };
