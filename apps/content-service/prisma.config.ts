import { defineConfig } from "prisma/config";

function normalizeDbUrl(url: string | undefined): string {
  if (!url) {
    return "postgresql://content_user:KITS2026@localhost:5432/content_service";
  }
  return url
    .replace("postgresql+asyncpg://", "postgresql://")
    .replace("postgresql+psycopg://", "postgresql://");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: normalizeDbUrl(process.env.CONTENT_DATABASE_URL ?? process.env.DATABASE_URL),
  },
});
