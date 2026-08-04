/**
 * Production entrypoint for Dokku / Docker.
 *
 * withEve() proxies /eve/v1/* to http://127.0.0.1:4274, but next start does not
 * reliably spawn that Nitro server in container deploys. Start it ourselves,
 * wait until it accepts connections, then boot Next.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import { resolve } from "node:path";

const appRoot = process.cwd();
const eveEntry = resolve(appRoot, ".output/server/index.mjs");
const evePort = Number.parseInt(process.env.EVE_NEXT_PRODUCTION_PORT || "4274", 10);
const nextPort = process.env.PORT || "3000";

if (!existsSync(eveEntry)) {
  console.error(
    `[start-production] Missing ${eveEntry}. Run \`eve build\` (or \`pnpm run build\`) before start.`,
  );
  process.exit(1);
}

if (!Number.isInteger(evePort) || evePort < 1 || evePort > 65535) {
  console.error(
    `[start-production] EVE_NEXT_PRODUCTION_PORT must be an integer 1–65535 (got ${String(process.env.EVE_NEXT_PRODUCTION_PORT)}).`,
  );
  process.exit(1);
}

/** @type {import('node:child_process').ChildProcess[]} */
const children = [];

function shutdown(signal) {
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

for (const signal of /** @type {const} */ (["SIGINT", "SIGTERM"])) {
  process.on(signal, () => {
    shutdown(signal);
    process.exit(0);
  });
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {NodeJS.ProcessEnv} env
 */
function spawnChild(command, args, env) {
  const child = spawn(command, args, {
    cwd: appRoot,
    env,
    stdio: "inherit",
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    shutdown("SIGTERM");
    if (signal) process.exit(1);
    process.exit(code ?? 1);
  });
  return child;
}

/**
 * @param {number} port
 * @param {number} timeoutMs
 */
function waitForPort(port, timeoutMs = 60_000) {
  const started = Date.now();
  return new Promise((resolveWait, reject) => {
    const tryConnect = () => {
      const socket = net.connect({ host: "127.0.0.1", port }, () => {
        socket.end();
        resolveWait(undefined);
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`[start-production] Timed out waiting for eve on 127.0.0.1:${port}`));
          return;
        }
        setTimeout(tryConnect, 200);
      });
    };
    tryConnect();
  });
}

console.log(`[start-production] starting eve on 127.0.0.1:${evePort}`);
spawnChild(process.execPath, [eveEntry], {
  ...process.env,
  HOST: "127.0.0.1",
  NITRO_HOST: "127.0.0.1",
  NITRO_PORT: String(evePort),
  PORT: String(evePort),
});

try {
  await waitForPort(evePort);
} catch (error) {
  console.error(error instanceof Error ? error.message : "[start-production] eve failed to start");
  shutdown("SIGTERM");
  process.exit(1);
}

console.log(`[start-production] eve is up; starting Next on 0.0.0.0:${nextPort}`);

spawnChild(process.execPath, ["node_modules/next/dist/bin/next", "start"], {
  ...process.env,
  HOSTNAME: process.env.HOSTNAME || "0.0.0.0",
  PORT: String(nextPort),
});
