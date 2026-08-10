// This file starts the API Gateway HTTP process.
import { app } from "./app.js";
import { apiGatewayConfig } from "./config/index.js";

app.listen(apiGatewayConfig.port, () => {
  console.log(`api-gateway listening on http://localhost:${apiGatewayConfig.port}`);
});
