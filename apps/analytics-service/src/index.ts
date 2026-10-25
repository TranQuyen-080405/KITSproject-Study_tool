import { app } from "./app.js";
import { config } from "./config/index.js";
import { prisma } from "./db.js";

await prisma.$connect();
const server = app.listen(config.port, () => {
  console.log(`analytics-service listening on :${config.port} (PostgreSQL)`);
});
function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
