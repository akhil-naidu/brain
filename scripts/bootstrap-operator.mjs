#!/usr/bin/env node
/**
 * Create the first Brain operator account via the bootstrap API.
 *
 * Usage:
 *   BRAIN_BOOTSTRAP_TOKEN=... node scripts/bootstrap-operator.mjs email@example.com 'password'
 *
 * Optional:
 *   BRAIN_INTERNAL_URL=http://127.0.0.1:3000
 */
const email = process.argv[2];
const password = process.argv[3];
const origin = (process.env.BRAIN_INTERNAL_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const bootstrapToken = process.env.BRAIN_BOOTSTRAP_TOKEN;

if (!email || !password) {
  console.error("Usage: node scripts/bootstrap-operator.mjs <email> <password>");
  process.exit(1);
}

const response = await fetch(`${origin}/api/auth/bootstrap`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    email,
    password,
    bootstrapToken: bootstrapToken || undefined,
  }),
});

const data = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(data.error || `Bootstrap failed (${response.status})`);
  process.exit(1);
}

console.log(`Created operator ${data.user?.email} (${data.user?.id})`);
