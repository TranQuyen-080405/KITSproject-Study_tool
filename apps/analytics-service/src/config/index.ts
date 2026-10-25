import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serviceRoot = fileURLToPath(new URL("../../", import.meta.url));
function envFile(filename: string): Record<string, string> {
  try {
    return Object.fromEntries(readFileSync(filename, "utf8").split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match) return [];
      const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
      return [[match[1], value]];
    }));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return {};
  }
}
const local = envFile(path.join(serviceRoot, ".env"));
const root = envFile(path.resolve(serviceRoot, "../../.env"));
const port = Number.parseInt(process.env.PORT ?? "3003", 10);

export function normalizeDatabaseUrl(url: string): string {
  const normalized = url.replace("postgresql+asyncpg://", "postgresql://").replace("postgresql+psycopg://", "postgresql://");
  const parsed = new URL(normalized);
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("ANALYTICS_DATABASE_URL must be a PostgreSQL URL");
  }
  return normalized;
}

export const config = {
  port: Number.isFinite(port) ? port : 3003,
  // Never inherit the root DATABASE_URL: in this workspace that belongs to AI.
  databaseUrl: normalizeDatabaseUrl(
    process.env.ANALYTICS_DATABASE_URL || root.ANALYTICS_DATABASE_URL ||
    local.ANALYTICS_DATABASE_URL || local.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/analytics_service",
  ),
  // Only the one-time JSON import command uses this path.
  legacyDataFile: path.resolve(serviceRoot, process.env.ANALYTICS_DATA_FILE || local.ANALYTICS_DATA_FILE || ".analytics-data.json"),
};
