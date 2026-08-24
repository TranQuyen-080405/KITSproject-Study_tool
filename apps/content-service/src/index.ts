import { app } from "./app.js";
import { config } from "./config/index.js";
import { prisma } from "./db.js";

const server = app.listen(config.port, () => {
  console.log(`content-service listening on :${config.port}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
