import type { DatabaseSync } from "node:sqlite";

type SqlRow = Record<string, null | number | bigint | string | Uint8Array>;

export type InstanceUserRow = {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly hasPassword: boolean;
  readonly createdAt: string | null;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/** Lists host users for instance-admin management (password reset, etc.). */
export function listInstanceUsers(db: DatabaseSync): readonly InstanceUserRow[] {
  let rows: SqlRow[];
  try {
    rows = db
      .prepare(
        `SELECT u.id AS id, u.email AS email, u.name AS name, u.createdAt AS createdAt,
                CASE WHEN a.id IS NULL THEN 0 ELSE 1 END AS hasPassword
         FROM user u
         LEFT JOIN account a
           ON a.userId = u.id AND a.providerId = 'credential' AND a.password IS NOT NULL
         ORDER BY u.createdAt ASC`,
      )
      .all();
  } catch {
    return [];
  }

  return rows.flatMap((row) => {
    const id = asString(row["id"]);
    const email = asString(row["email"]);
    if (!id || !email) {
      return [];
    }
    return [
      {
        id,
        email,
        name: asString(row["name"]),
        hasPassword: Boolean(row["hasPassword"]),
        createdAt: asString(row["createdAt"]),
      },
    ];
  });
}
