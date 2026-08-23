#!/bin/sh
set -e

echo "🚀 Starting Excel to Dashboard App..."

# Push Prisma Schema to database if DATABASE_URL is available
if [ -n "$DATABASE_URL" ]; then
  echo "📦 Syncing Prisma Database Schema..."
  npx prisma db push --accept-data-loss || true
fi

echo "🌐 Launching Next.js Production Server on port ${PORT:-3000}..."
exec npm start -- -p ${PORT:-3000} -H 0.0.0.0
