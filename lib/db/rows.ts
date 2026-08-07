import type { QueryResult, QueryResultRow } from "pg";

/** Safe row shape for Brain SQL helpers (avoids `any` assertions from pg). */
export type DbRow = QueryResultRow & Record<string, unknown>;

export function dbRows<T extends DbRow = DbRow>(result: QueryResult<T>): T[] {
  return result.rows;
}

export function dbRow<T extends DbRow = DbRow>(result: QueryResult<T>): T | undefined {
  return result.rows[0];
}

export function countFromDbRow(row: Record<string, unknown> | undefined): number {
  const value = row?.["count"];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
