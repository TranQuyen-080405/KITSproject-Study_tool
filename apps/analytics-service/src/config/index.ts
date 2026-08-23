// This file will load configuration for the Analytics Service.
import path from "node:path";

const port = Number.parseInt(process.env.PORT ?? "303", 10);

export const config = {
  port: Number.isFinite(port) ? port : 3003,
  dataFile: process.env.ANALYTICS_DATA_FILE ?? path.resolve(process.cwd(), ".analytics-data.json"),
};
