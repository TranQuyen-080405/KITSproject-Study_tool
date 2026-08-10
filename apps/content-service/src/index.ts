// This file starts the Content Service HTTP process.
import { app } from "./app.js";
import { contentServiceConfig } from "./config/index.js";

app.listen(contentServiceConfig.port, () => {
  console.log(`content-service listening on http://localhost:${contentServiceConfig.port}`);
});
