#!/usr/bin/env bash
# Creates additional databases listed in $POSTGRES_MULTIPLE_DATABASES (csv).
# The official postgres image only creates one DB on init; we want a
# separate `keycloak` schema next to `stateboard` so Keycloak's tables
# don't intermingle with ours.
set -e
set -u

if [ -n "${POSTGRES_MULTIPLE_DATABASES:-}" ]; then
  for db in $(echo "$POSTGRES_MULTIPLE_DATABASES" | tr ',' ' '); do
    echo "creating database $db"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
      CREATE DATABASE "$db";
      GRANT ALL PRIVILEGES ON DATABASE "$db" TO "$POSTGRES_USER";
EOSQL
  done
fi
