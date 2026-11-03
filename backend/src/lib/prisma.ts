import { getRequiredEnv } from "../utils/env";
import { PrismaClient } from "../../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ 
  connectionString: getRequiredEnv("DATABASE_URL"), 
});

export const prisma = new PrismaClient({ adapter });