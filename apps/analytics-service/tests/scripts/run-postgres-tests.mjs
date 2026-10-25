import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { Client } = require("pg");
const serviceRoot = fileURLToPath(new URL("../..", import.meta.url));
function vars(url) {
  try {
    return Object.fromEntries(readFileSync(url, "utf8").split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^\s*([\w]+)\s*=\s*(.*?)\s*$/);
      return match ? [[match[1], match[2].replace(/^["']|["']$/g, "")]] : [];
    }));
  } catch (error) { if (error.code !== "ENOENT") throw error; return {}; }
}
const local = vars(new URL("../../.env", import.meta.url));
const root = vars(new URL("../../../../.env", import.meta.url));
const databaseUrl = process.env.ANALYTICS_TEST_DATABASE_URL || process.env.ANALYTICS_DATABASE_URL ||
  root.ANALYTICS_DATABASE_URL || local.ANALYTICS_DATABASE_URL || local.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/analytics_service";
const url = new URL(databaseUrl.replace("postgresql+psycopg://", "postgresql://").replace("postgresql+asyncpg://", "postgresql://"));
if (!["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("This test runner requires local PostgreSQL");
const schema = "analytics_test_" + randomUUID().replaceAll("-", "");
url.searchParams.set("schema", schema);
const env = { ...process.env, ANALYTICS_DATABASE_URL: url.href, ANALYTICS_TEST_DATABASE_URL: url.href };
function run(modulePath, args) {
  const result = spawnSync(process.execPath, [require.resolve(modulePath), ...args], {
    cwd: serviceRoot, env, stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Analytics integration command failed");
}
try {
  run("prisma/build/index.js", ["migrate", "deploy", "--config", "prisma.config.ts"]);
  run("vitest/vitest.mjs", ["run", "tests/postgres.test.ts"]);
} finally {
  if (!/^analytics_test_[a-f0-9]{32}$/.test(schema)) throw new Error("Invalid test schema");
  url.searchParams.delete("schema");
  const client = new Client({ connectionString: url.href });
  try {
    await client.connect();
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally { await client.end(); }
}
