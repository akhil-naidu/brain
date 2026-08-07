import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { requireDatabaseUrl } from "@/lib/db/url";

const globalForPool = globalThis as typeof globalThis & {
  brainPgPool?: Pool;
  brainPgPoolUrl?: string;
};

export function getPool(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Pool {
  const url = requireDatabaseUrl(env);
  if (!globalForPool.brainPgPool || globalForPool.brainPgPoolUrl !== url) {
    globalForPool.brainPgPool?.end().catch(() => {
      // ignore close errors when replacing the pool
    });
    globalForPool.brainPgPool = new Pool({
      connectionString: url,
      max: 10,
    });
    globalForPool.brainPgPoolUrl = url;
  }
  return globalForPool.brainPgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Promise<QueryResult<T>> {
  return getPool(env).query<T>(text, [...params]);
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): Promise<T> {
  const client = await getPool(env).connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore
    }
    throw error;
  } finally {
    client.release();
  }
}

/** Test helper: drop the in-process pool singleton. */
export async function resetPoolForTests(): Promise<void> {
  const pool = globalForPool.brainPgPool;
  delete globalForPool.brainPgPool;
  delete globalForPool.brainPgPoolUrl;
  if (pool) {
    await pool.end();
  }
}
