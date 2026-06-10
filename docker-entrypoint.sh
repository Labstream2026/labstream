#!/bin/sh
set -e

echo "[entrypoint] Waiting for Postgres at $DATABASE_URL ..."
# crude wait — Prisma will retry too, this just gives clearer logs
for i in $(seq 1 30); do
  if node -e "
    const u = new URL(process.env.DATABASE_URL);
    require('net').createConnection({host:u.hostname,port:u.port||5432})
      .on('connect', () => process.exit(0))
      .on('error', () => process.exit(1));
  " 2>/dev/null; then
    echo "[entrypoint] Postgres is reachable."
    break
  fi
  echo "[entrypoint] Postgres not ready yet ($i/30), retrying in 2s..."
  sleep 2
done

echo "[entrypoint] Running prisma migrate deploy ..."
npx prisma migrate deploy

if [ "$RUN_SEED" = "true" ]; then
  echo "[entrypoint] Running public seed ..."
  npx tsx prisma/seed-public.ts || echo "[entrypoint] Seed failed (continuing)"
fi

echo "[entrypoint] Starting Next.js server: $@"
exec "$@"
