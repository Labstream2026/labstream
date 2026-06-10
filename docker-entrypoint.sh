#!/bin/sh
set -e

# En la imagen standalone de Next.js NO existen los symlinks de
# node_modules/.bin, así que `npx prisma` / `npx tsx` fallan con
# "prisma: not found". Invocamos los CLIs directamente vía node.
PRISMA_CLI="/app/node_modules/prisma/build/index.js"
TSX_CLI="/app/node_modules/tsx/dist/cli.mjs"

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
node "$PRISMA_CLI" migrate deploy

if [ "$RUN_SEED" = "true" ]; then
  echo "[entrypoint] Running public seed ..."
  node "$TSX_CLI" prisma/seed-public.ts || echo "[entrypoint] Seed failed (continuing)"
fi

echo "[entrypoint] Starting Next.js server: $@"
exec "$@"
