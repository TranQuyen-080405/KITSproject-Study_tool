// Start the Analytics Service HTTP process.
import { app } from "./app.js";
import { config } from "./config/index.js";

const server = app.listen(config.port, () => {
  console.log(`analytics-service listening on :${config.port}`);
});

function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
