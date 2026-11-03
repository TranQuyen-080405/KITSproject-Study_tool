import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serviceRoot = fileURLToPath(new URL("../../", import.meta.url));

function readEnvFile(filename: string): Record<string, string> {
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

const file = readEnvFile(path.join(serviceRoot, ".env"));
const parsedPort = Number.parseInt(process.env.PORT ?? "3001", 10);

function normalizeDbUrl(url: string): string {
  return url
    .replace("postgresql+asyncpg://", "postgresql://")
    .replace("postgresql+psycopg://", "postgresql://");
}

export const config = {
  port: Number.isFinite(parsedPort) ? parsedPort : 3001,
  databaseUrl: normalizeDbUrl(
    process.env.CONTENT_DATABASE_URL ?? file.CONTENT_DATABASE_URL ??
      "postgresql://content_user:KITS2026@localhost:5432/content_service",
  ),
};
