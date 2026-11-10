/**
 * Local PostgreSQL for development and tests, using real PostgreSQL binaries
 * shipped through the `embedded-postgres` npm package. Not used in production:
 * point DATABASE_URL at a managed PostgreSQL instead.
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const port = Number(process.env.DEV_DB_PORT ?? 5433);
const databaseDir = path.resolve(process.env.DEV_DB_DIR ?? ".pgdata");
const databases = ["shoeshop", "shoeshop_test"];

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "postgres",
  port,
  persistent: true,
});

const isNew = !existsSync(path.join(databaseDir, "PG_VERSION"));
if (isNew) await pg.initialise();
await pg.start();

const client = pg.getPgClient();
await client.connect();
for (const name of databases) {
  const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
  if (!rowCount) await client.query(`CREATE DATABASE "${name}"`);
}
await client.end();

console.log(`PostgreSQL running on postgresql://postgres:postgres@localhost:${port} (databases: ${databases.join(", ")})`);
console.log("Press Ctrl+C to stop.");

const shutdown = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
setInterval(() => {}, 1 << 30);
