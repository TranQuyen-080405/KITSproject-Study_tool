// This file starts the Analytics Service HTTP process.
import { app } from "./app.js";
import { analyticsServiceConfig } from "./config/index.js";

app.listen(analyticsServiceConfig.port, () => {
  console.log(`analytics-service listening on http://localhost:${analyticsServiceConfig.port}`);
});
