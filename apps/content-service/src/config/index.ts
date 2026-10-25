const parsedPort = Number.parseInt(process.env.PORT ?? "3001", 10);

function normalizeDbUrl(url: string | undefined): string {
  if (!url) {
    return "postgresql://content_user:KITS2026@localhost:5432/content_service";
  }
  return url
    .replace("postgresql+asyncpg://", "postgresql://")
    .replace("postgresql+psycopg://", "postgresql://");
}

export const config = {
  port: Number.isFinite(parsedPort) ? parsedPort : 3001,
  databaseUrl: normalizeDbUrl(process.env.CONTENT_DATABASE_URL ?? process.env.DATABASE_URL),
};
