// Local Postgres without Docker: real Postgres binaries from npm, data in server/.pgdata
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dataDir = fileURLToPath(new URL("../.pgdata", import.meta.url));
const pg = new EmbeddedPostgres({ databaseDir: dataDir, user: "postgres", password: "postgres", port: 54329, persistent: true, initdbFlags: ["--encoding=UTF8", "--locale=C"] });

if (!existsSync(dataDir)) await pg.initialise();
await pg.start();
for (const db of ["fintrack", "fintrack_test"]) {
  await pg.createDatabase(db).catch(() => {}); // already exists
}
console.log("Postgres running on localhost:54329 (Ctrl+C to stop)");

const stop = async () => { await pg.stop(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
