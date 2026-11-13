#!/bin/sh
set -e

echo "🚀 Starting V-COP CMTC Dashboard App..."

# Ensure DATABASE_URL is always set and exported for Prisma & Next.js
if [ -z "$DATABASE_URL" ] && [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ] && [ -n "$DB_NAME" ]; then
  DB_HOST="${DB_HOST:-postgres-db}"
  DB_PORT="${DB_PORT:-5432}"
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
else
  export DATABASE_URL
fi

# Push Prisma Schema to database if DATABASE_URL is available
if [ -n "$DATABASE_URL" ]; then
  echo "⏳ Waiting a few seconds for PostgreSQL connection..."
  sleep 3

  echo "📦 Syncing Prisma Database Schema..."
  node ./node_modules/prisma/build/index.js db push --accept-data-loss --skip-generate || true
  
  echo "👤 Syncing Accounts from Environment..."
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } }
    });
    async function initAccounts() {
      try {
        const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
        const password = process.env.ADMIN_PASSWORD || '';
        if (email && password) {
          const hash = bcrypt.hashSync(password, 10);
          const admin = await prisma.adminUser.upsert({
            where: { email },
            update: { password: hash, role: 'ADMIN' },
            create: {
              email,
              password: hash,
              name: 'ผู้ดูแลระบบ (Admin)',
              role: 'ADMIN'
            }
          });
          console.log('✅ Admin Account Ready:', admin.email);
        }

        const reportEmail = (process.env.REPORT_EMAIL || '').trim().toLowerCase();
        const reportPassword = process.env.REPORT_PASSWORD || '';
        if (reportEmail && reportPassword) {
          const reportHash = bcrypt.hashSync(reportPassword, 10);
          const reportUser = await prisma.adminUser.upsert({
            where: { email: reportEmail },
            update: { password: reportHash, role: 'REPORT' },
            create: {
              email: reportEmail,
              password: reportHash,
              name: 'ผู้ดูและพิมพ์รายงาน (Report)',
              role: 'REPORT'
            }
          });
          console.log('✅ Report Account Ready:', reportUser.email);
        }
      } catch (e) {
        console.warn('Account sync warning:', e.message);
      } finally {
        await prisma.\$disconnect();
      }
    }
    initAccounts();
  " || true
fi

echo "🌐 Launching Next.js Production Server on port ${PORT:-3000}..."
exec npm start -- -p ${PORT:-3000} -H 0.0.0.0
