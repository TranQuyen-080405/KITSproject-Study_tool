// This file starts the Learning Service HTTP process.
import { app } from "./app.js";
import { learningServiceConfig } from "./config/index.js";

app.listen(learningServiceConfig.port, () => {
  console.log(`learning-service listening on http://localhost:${learningServiceConfig.port}`);
});
