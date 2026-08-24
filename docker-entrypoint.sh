#!/bin/sh
set -e

echo "🚀 Starting V-COP CMTC Dashboard App..."

# Push Prisma Schema to database if DATABASE_URL is available
if [ -n "$DATABASE_URL" ]; then
  echo "📦 Syncing Prisma Database Schema..."
  npx prisma db push --accept-data-loss || true
  
  echo "👤 Ensuring Admin Account from Environment..."
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient();
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
