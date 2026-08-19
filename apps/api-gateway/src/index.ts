import { app } from "./app.js";
import { config } from "./config/index.js";

const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`api-gateway listening on 0.0.0.0:${config.port}`);
});

function shutdown(signal: NodeJS.Signals) {
  console.log(`api-gateway received ${signal}, shutting down`);
  server.close((error) => {
    if (error) {
      console.error("api-gateway shutdown failed", error);
      process.exit(1);
    }

    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
