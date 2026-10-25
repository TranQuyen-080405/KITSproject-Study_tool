import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { Client } = require("pg");
const serviceRoot = fileURLToPath(new URL("../..", import.meta.url));
let databaseUrl = process.env.CONTENT_TEST_DATABASE_URL ?? process.env.CONTENT_DATABASE_URL;
if (!databaseUrl) {
  const envFile = readFileSync(new URL("../../../../.env", import.meta.url), "utf8");
  databaseUrl = envFile.split(/\r?\n/).find((line) => line.startsWith("CONTENT_DATABASE_URL="))?.split("=").slice(1).join("=").trim();
}
if (!databaseUrl) throw new Error("Set CONTENT_DATABASE_URL to a local PostgreSQL database.");
databaseUrl = databaseUrl.replace(/^["']|["']$/g, "").replace("postgresql+asyncpg://", "postgresql://").replace("postgresql+psycopg://", "postgresql://");
const url = new URL(databaseUrl);
if (!["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("This integration runner only uses local PostgreSQL.");
const schema = "deck_tests_" + randomUUID().replaceAll("-", "");
url.searchParams.set("schema", schema);
const env = { ...process.env, CONTENT_DATABASE_URL: url.href, CONTENT_TEST_DATABASE_URL: url.href };

function run(modulePath, args) {
  const result = spawnSync(process.execPath, [require.resolve(modulePath), ...args], {
    cwd: serviceRoot, env, stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Integration command failed: " + args.join(" "));
}

try {
  run("prisma/build/index.js", ["db", "push", "--config", "prisma.config.ts"]);
  run("vitest/vitest.mjs", ["run", "tests/integration/deck-tests.test.ts"]);
} finally {
  if (!/^deck_tests_[a-f0-9]{32}$/.test(schema)) throw new Error("Invalid disposable schema");
  url.searchParams.delete("schema");
  const client = new Client({ connectionString: url.href });
  try {
    await client.connect();
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally {
    await client.end();
  }
}
