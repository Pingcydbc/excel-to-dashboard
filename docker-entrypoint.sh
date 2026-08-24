#!/bin/sh
set -e

echo "🚀 Starting V-COP CMTC Dashboard App..."

# Push Prisma Schema to database if DATABASE_URL is available
if [ -n "$DATABASE_URL" ]; then
  echo "📦 Syncing Prisma Database Schema..."
  npx prisma db push --accept-data-loss || true
  
  echo "👤 Ensuring Default Admin User..."
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient();
    async function initAdmin() {
      try {
        const count = await prisma.adminUser.count();
        if (count === 0) {
          const hash = bcrypt.hashSync('admin1234', 10);
          await prisma.adminUser.create({
            data: {
              email: 'admin@gmail.com',
              password: hash,
              name: 'ผู้ดูแลระบบ (Admin)',
              role: 'ADMIN'
            }
          });
          console.log('✅ Default Admin created: admin@gmail.com');
        }
      } catch (e) {
        console.warn('Admin init check warning:', e.message);
      } finally {
        await prisma.\$disconnect();
      }
    }
    initAdmin();
  " || true
fi

echo "🌐 Launching Next.js Production Server on port ${PORT:-3000}..."
exec npm start -- -p ${PORT:-3000} -H 0.0.0.0
