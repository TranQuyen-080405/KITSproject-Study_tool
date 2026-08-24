const parsedPort = Number.parseInt(process.env.PORT ?? "3001", 10);

export const config = {
  port: Number.isFinite(parsedPort) ? parsedPort : 3001,
  databaseUrl:
    process.env.CONTENT_DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5434/content_service",
};
