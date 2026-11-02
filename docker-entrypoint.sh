#!/bin/sh
set -e

echo "🚀 Starting V-COP CMTC Dashboard App..."

# Ensure DATABASE_URL is always set and exported for Prisma & Next.js
if [ -z "$DATABASE_URL" ]; then
  DB_USER="${DB_USER:-postgres}"
  DB_PASSWORD="${DB_PASSWORD:-password123}"
  DB_HOST="${DB_HOST:-postgres-db}"
  DB_PORT="${DB_PORT:-5432}"
  DB_NAME="${DB_NAME:-student_dashboard}"
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
  echo "ℹ️ DATABASE_URL was not set; using default container database connection (${DB_HOST}:${DB_PORT}/${DB_NAME})"
else
  export DATABASE_URL
fi

# Push Prisma Schema to database if DATABASE_URL is available
if [ -n "$DATABASE_URL" ]; then
  echo "📦 Syncing Prisma Database Schema..."
  npx prisma db push --accept-data-loss || true
  
  echo "👤 Ensuring Admin Account from Environment..."
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } }
    });
    async function initAdmin() {
      try {
        const email = (process.env.ADMIN_EMAIL || 'admin@gmail.com').trim().toLowerCase();
        const password = process.env.ADMIN_PASSWORD || 'admincmtcvcop123';
        const hash = bcrypt.hashSync(password, 10);
        const admin = await prisma.adminUser.upsert({
          where: { email },
          update: { password: hash },
          create: {
            email,
            password: hash,
            name: 'ผู้ดูแลระบบ (Admin)',
            role: 'ADMIN'
          }
        });
        console.log('✅ Admin Account Ready:', admin.email);
      } catch (e) {
        console.warn('Admin init warning:', e.message);
      } finally {
        await prisma.\$disconnect();
      }
    }
    initAdmin();
  " || true
fi

echo "🌐 Launching Next.js Production Server on port ${PORT:-3000}..."
exec npm start -- -p ${PORT:-3000} -H 0.0.0.0
