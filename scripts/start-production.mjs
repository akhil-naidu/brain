/**
 * Production entrypoint for Dokku / Docker.
 *
 * withEve() proxies /eve/v1/* to http://127.0.0.1:4274, but next start does not
 * reliably spawn that Nitro server in container deploys. Start it ourselves,
 * wait until the port, then boot Next.
 *
 * Snowflake MCP `url` is baked into the Nitro bundle at `eve build` time.
 * Production always loads that bundled manifest — so after Set up we patch
 * `.output` with the account URL, then respawn eve.
 */
import { spawn } from "node:child_process";
import { existsSync, watch } from "node:fs";
import net from "node:net";
import { dirname, resolve } from "node:path";
import { patchSnowflakeBundledMcpUrl } from "./patch-snowflake-bundled-url.mjs";

const appRoot = process.cwd();
const eveEntry = resolve(appRoot, ".output/server/index.mjs");
const evePort = Number.parseInt(process.env.EVE_NEXT_PRODUCTION_PORT || "4274", 10);
const nextPort = process.env.PORT || "3000";
const snowflakeCredentialsPath = resolve(appRoot, ".eve", "mcp-app-credentials-snowflake.json");

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

/** @type {import('node:child_process').ChildProcess | null} */
let eveChild = null;
/** @type {import('node:child_process').ChildProcess | null} */
let nextChild = null;
let shuttingDown = false;
let restartingEve = false;

const eveEnv = {
  ...process.env,
  HOST: "127.0.0.1",
  NITRO_HOST: "127.0.0.1",
  NITRO_PORT: String(evePort),
  PORT: String(evePort),
};

const nextEnv = {
  ...process.env,
  HOSTNAME: process.env.HOSTNAME || "0.0.0.0",
  PORT: String(nextPort),
};

function shutdown(signal) {
  shuttingDown = true;
  for (const child of [eveChild, nextChild]) {
    if (child && !child.killed) {
      child.kill(signal);
    }
  }
}

for (const signal of /** @type {const} */ (["SIGINT", "SIGTERM"])) {
  process.on(signal, () => {
    shutdown(signal);
    process.exit(0);
  });
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

function applySnowflakeBundledUrlPatch(reason) {
  const result = patchSnowflakeBundledMcpUrl(appRoot);
  if (!result.ok) {
    console.log(
      `[start-production] Snowflake bundle URL patch skipped (${reason}): ${result.reason}`,
    );
    return;
  }
  console.log(
    `[start-production] Snowflake bundle URL patched (${reason}): ${result.patchedFiles.join(", ")}`,
  );
}

function startEve() {
  console.log(`[start-production] starting eve on 127.0.0.1:${evePort}`);
  const child = spawn(process.execPath, [eveEntry], {
    cwd: appRoot,
    env: eveEnv,
    stdio: "inherit",
  });
  eveChild = child;
  child.on("exit", (code, signal) => {
    if (shuttingDown || restartingEve || child !== eveChild) {
      return;
    }
    console.error(
      `[start-production] eve exited unexpectedly (code=${String(code)} signal=${String(signal)})`,
    );
    shutdown("SIGTERM");
    process.exit(code ?? 1);
  });
  return child;
}

/**
 * @param {number} [debounceMs]
 */
function watchSnowflakeCredentials(debounceMs = 500) {
  const directory = dirname(snowflakeCredentialsPath);
  if (!existsSync(directory)) {
    console.log(
      `[start-production] ${directory} missing; Snowflake credential watch inactive until Set up creates it`,
    );
    return;
  }

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  try {
    watch(directory, (eventType, filename) => {
      if (filename && filename !== "mcp-app-credentials-snowflake.json") {
        return;
      }
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        void restartEveAfterCredentialChange(eventType);
      }, debounceMs);
    });
    console.log(`[start-production] watching ${snowflakeCredentialsPath} to reload eve`);
  } catch (error) {
    console.warn(
      `[start-production] unable to watch Snowflake credentials: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * @param {string} eventType
 */
async function restartEveAfterCredentialChange(eventType) {
  if (shuttingDown || restartingEve || !eveChild) {
    return;
  }
  restartingEve = true;
  console.log(
    `[start-production] Snowflake credentials ${eventType}; patching bundled MCP URL and restarting eve`,
  );
  applySnowflakeBundledUrlPatch("credential-change");
  const previous = eveChild;
  try {
    if (!previous.killed) {
      previous.kill("SIGTERM");
    }
    await new Promise((resolveWait) => {
      if (previous.exitCode !== null || previous.signalCode !== null) {
        resolveWait(undefined);
        return;
      }
      previous.once("exit", () => resolveWait(undefined));
      setTimeout(() => resolveWait(undefined), 10_000);
    });
    startEve();
    await waitForPort(evePort);
    console.log("[start-production] eve reloaded after Snowflake credential change");
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "[start-production] eve failed to reload after Snowflake credential change",
    );
    shutdown("SIGTERM");
    process.exit(1);
  } finally {
    restartingEve = false;
  }
}

applySnowflakeBundledUrlPatch("boot");
startEve();

try {
  await waitForPort(evePort);
} catch (error) {
  console.error(error instanceof Error ? error.message : "[start-production] eve failed to start");
  shutdown("SIGTERM");
  process.exit(1);
}

watchSnowflakeCredentials();

console.log(`[start-production] eve is up; starting Next on 0.0.0.0:${nextPort}`);
nextChild = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start"], {
  cwd: appRoot,
  env: nextEnv,
  stdio: "inherit",
});
nextChild.on("exit", (code, signal) => {
  if (shuttingDown) {
    return;
  }
  console.error(
    `[start-production] Next exited unexpectedly (code=${String(code)} signal=${String(signal)})`,
  );
  shutdown("SIGTERM");
  process.exit(code ?? 1);
});
