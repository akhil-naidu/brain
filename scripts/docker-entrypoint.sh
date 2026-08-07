#!/bin/sh
# Ensure the persistent /.eve volume is writable by the app user.
# Dokku/dflow mounts often arrive as root-owned, which breaks eve (EACCES).
set -eu

mkdir -p /app/.eve
chown -R nextjs:nodejs /app/.eve
chmod 700 /app/.eve

exec gosu nextjs "$@"
