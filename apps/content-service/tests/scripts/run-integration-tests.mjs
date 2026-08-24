import { spawnSync } from "node:child_process";

const testDatabaseUrl =
  process.env.CONTENT_TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5434/content_service?schema=content_test";
const env = {
  ...process.env,
  CONTENT_DATABASE_URL: testDatabaseUrl,
  CONTENT_TEST_DATABASE_URL: testDatabaseUrl,
};
const corepack = process.platform === "win32" ? "corepack.cmd" : "corepack";

function run(args) {
  const result = spawnSync(corepack, ["pnpm", ...args], {
    cwd: new URL("../..", import.meta.url),
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(["exec", "prisma", "migrate", "deploy", "--config", "prisma.config.ts"]);
run(["exec", "vitest", "run", "tests/integration/database.test.ts"]);
