/**
 * Global setup for integration tests.
 * Creates a dedicated `words_test` database on the local Postgres instance,
 * pushes the Prisma schema, then tears it down after all tests complete.
 *
 * Expects Postgres to be running (via docker-compose db service).
 */
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../../../')
const DB_PACKAGE = path.join(ROOT, 'packages/db')

const PG_HOST = process.env.PGHOST || 'localhost'
const PG_PORT = process.env.PGPORT || process.env.POSTGRES_PORT || '5433'
const PG_USER = process.env.PGUSER || 'words'
const PG_PASS = process.env.PGPASSWORD || 'words'
const TEST_DB = 'words_test'

const TEST_DATABASE_URL = `postgresql://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${TEST_DB}`

function exec(cmd: string, env?: Record<string, string>) {
  execSync(cmd, {
    stdio: 'pipe',
    cwd: DB_PACKAGE,
    env: { ...process.env, ...env },
  })
}

function psql(sql: string) {
  const connStr = `postgresql://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/postgres`
  execSync(`psql "${connStr}" -c "${sql}"`, { stdio: 'pipe' })
}

export async function setup() {
  // Create test database if it doesn't exist
  try {
    psql(`CREATE DATABASE ${TEST_DB};`)
  }
  catch {
    // Already exists — fine
  }

  // Push Prisma schema to test database
  exec('npx prisma db push --accept-data-loss --url ' + JSON.stringify(TEST_DATABASE_URL), {
    DATABASE_URL: TEST_DATABASE_URL,
  })

  // Make test DATABASE_URL available to all test processes
  process.env.DATABASE_URL = TEST_DATABASE_URL
}

export async function teardown() {
  // Drop test database after suite completes
  try {
    psql(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE);`)
  }
  catch {
    // Best-effort cleanup
  }
}
