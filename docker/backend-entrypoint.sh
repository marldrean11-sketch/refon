#!/bin/sh
# Applies pending migrations, then starts the API.
#
# Only `migrate deploy` is ever used here. `migrate dev` and `migrate reset` must never
# run in a container: dev can create a shadow database and reset destroys data.
set -e

if [ -z "${DATABASE_URL}" ]; then
  echo "entrypoint: DATABASE_URL must be set." >&2
  exit 1
fi

echo "entrypoint: applying pending migrations (migrate deploy)"
npx prisma migrate deploy --schema backend/prisma/schema.prisma

# The mail outbox lives on a volume in compose, but the directory must exist for the
# local storage driver and for the outbox fallback to append cleanly.
mkdir -p backend/uploads backend/tmp

echo "entrypoint: starting ReFon API"
exec "$@"