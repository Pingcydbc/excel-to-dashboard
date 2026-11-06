import { PrismaClient } from "@prisma/client";
import fs from "fs";

function isRunningInDocker(): boolean {
  if (process.platform === "win32") return false;
  try {
    return fs.existsSync("/.dockerenv");
  } catch {
    return false;
  }
}

function getDatabaseUrl(): string {
  const inDocker = isRunningInDocker();
  const hostPort = process.env.HOST_DB_PORT || "5435";
  const existingUrl = process.env.DATABASE_URL?.trim();

  if (existingUrl) {
    // When running locally outside Docker (e.g., npm run dev on Windows),
    // automatically map Docker service hostname 'postgres-db:5432' to 'localhost:<HOST_DB_PORT>'
    if (!inDocker && existingUrl.includes("@postgres-db:5432")) {
      const localUrl = existingUrl.replace("@postgres-db:5432", `@localhost:${hostPort}`);
      process.env.DATABASE_URL = localUrl;
      return localUrl;
    }
    // When running inside Docker container, map localhost back to postgres-db:5432
    if (inDocker && (existingUrl.includes(`@localhost:${hostPort}`) || existingUrl.includes("@localhost:5432"))) {
      const dockerUrl = existingUrl
        .replace(`@localhost:${hostPort}`, "@postgres-db:5432")
        .replace("@localhost:5432", "@postgres-db:5432");
      process.env.DATABASE_URL = dockerUrl;
      return dockerUrl;
    }
    return existingUrl;
  }

  const user = process.env.DB_USER || "postgres";
  const password = encodeURIComponent(process.env.DB_PASSWORD || "password123");
  const host =
    process.env.DB_HOST || (inDocker ? "postgres-db" : "localhost");
  const port =
    process.env.DB_PORT ||
    (host === "localhost" || host === "127.0.0.1" ? hostPort : "5432");
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
