/**
 * Per-file setup: set DATABASE_URL for the test database.
 * The global setup already created the DB; this ensures each
 * test process has the correct connection string.
 */
const PG_HOST = process.env.PGHOST || 'localhost'
const PG_PORT = process.env.PGPORT || process.env.POSTGRES_PORT || '5433'
const PG_USER = process.env.PGUSER || 'words'
const PG_PASS = process.env.PGPASSWORD || 'words'

process.env.DATABASE_URL = `postgresql://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/words_test`
process.env.NODE_ENV = 'development'
process.env.CORS_ORIGIN = 'http://localhost:5173'
process.env.JWT_SECRET = 'test-secret'
