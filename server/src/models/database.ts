import { Pool, PoolConfig } from 'pg';

// ---------------------------------------------------------------------------
// Connection pool
// ---------------------------------------------------------------------------
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
};

export const pool = new Pool(poolConfig);

// Log connection events in development
pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client', err);
});

// ---------------------------------------------------------------------------
// Helper to run a single query
// ---------------------------------------------------------------------------
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
) {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.log('[db] query', { text: text.slice(0, 80), duration, rows: result.rowCount });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Helper to run inside a transaction
// ---------------------------------------------------------------------------
export async function transaction<T>(
  fn: (client: import('pg').PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Schema creation
// ---------------------------------------------------------------------------
export const CREATE_USERS_TABLE = `
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY,
  email          VARCHAR(255) UNIQUE NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  name           VARCHAR(255) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export const CREATE_MODELS_TABLE = `
CREATE TABLE IF NOT EXISTS models (
  id                       UUID PRIMARY KEY,
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                     VARCHAR(512) NOT NULL,
  model_type               VARCHAR(20) NOT NULL CHECK (model_type IN ('dcf', 'lbo', 'ma', 'comps')),
  company_name             VARCHAR(512) NOT NULL DEFAULT '',
  description              TEXT,
  folder_id                UUID,
  inputs_json              JSONB NOT NULL DEFAULT '{}',
  sensitivity_configs_json JSONB,
  tornado_config_json      JSONB,
  valuation_summary        TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_models_user_id ON models(user_id);
CREATE INDEX IF NOT EXISTS idx_models_model_type ON models(model_type);
CREATE INDEX IF NOT EXISTS idx_models_folder_id ON models(folder_id);
`;

export const CREATE_MODEL_VERSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS model_versions (
  id         UUID PRIMARY KEY,
  model_id   UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  version    INTEGER NOT NULL,
  data_json  JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (model_id, version)
);

CREATE INDEX IF NOT EXISTS idx_model_versions_model_id ON model_versions(model_id);
`;

export async function initializeDatabase(): Promise<void> {
  console.log('[db] Initializing database schema...');
  await query(CREATE_USERS_TABLE);
  await query(CREATE_MODELS_TABLE);
  await query(CREATE_MODEL_VERSIONS_TABLE);
  console.log('[db] Database schema initialized successfully');
}

// Allow running directly: npx ts-node src/models/database.ts
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('[db] Done');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[db] Failed to initialize:', err);
      process.exit(1);
    });
}
