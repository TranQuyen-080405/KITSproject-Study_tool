import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "./config/index.js";
import { PrismaClient } from "./generated/prisma/client.js";

const schema = new URL(config.databaseUrl).searchParams.get("schema") ?? "public";
const adapter = new PrismaPg({ connectionString: config.databaseUrl }, { schema });

export const prisma = new PrismaClient({ adapter });
