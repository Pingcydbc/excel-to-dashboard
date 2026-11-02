import { PrismaClient } from "@prisma/client";

function getDatabaseUrl(): string {
  const existingUrl = process.env.DATABASE_URL?.trim();
  if (existingUrl) {
    return existingUrl;
  }

  const user = process.env.DB_USER || "postgres";
  const password = encodeURIComponent(process.env.DB_PASSWORD || "password123");
  const host =
    process.env.DB_HOST ||
    (process.env.NODE_ENV === "production" ? "postgres-db" : "localhost");
  const port =
    process.env.DB_PORT ||
    (host === "localhost" || host === "127.0.0.1"
      ? process.env.HOST_DB_PORT || "5435"
      : "5432");
  const dbName = process.env.DB_NAME || "student_dashboard";

  const fallbackUrl = `postgresql://${user}:${password}@${host}:${port}/${dbName}?schema=public`;
  process.env.DATABASE_URL = fallbackUrl;
  return fallbackUrl;
}

const databaseUrl = getDatabaseUrl();

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
