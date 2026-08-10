import { app } from "./app.js";
import { userServiceConfig } from "./config/index.js";

app.listen(userServiceConfig.port, () => {
  console.log(`user-service listening on http://localhost:${userServiceConfig.port}`);
});
