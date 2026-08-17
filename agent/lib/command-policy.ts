export type CommandPolicyResult = "allow" | "deny";

const FORK_BOMB = /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;/;
const MKFS = /\bmkfs(?:\.\w+)?\b/i;
const DD_DEV = /\bdd\b[\s\S]*\bof=\/dev\//i;
const DROP_SQL = /\bDROP\s+(TABLE|DATABASE|SCHEMA|INDEX)\b/i;
const TRUNCATE_SQL = /\bTRUNCATE\s+(TABLE\s+)?[A-Za-z_"]/i;
const ALTER_DROP_SQL = /\bALTER\s+TABLE\b[\s\S]{0,400}\bDROP\b/i;

function collectStrings(value: unknown, into: string[]): void {
  if (typeof value === "string") {
    into.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, into);
    }
    return;
  }
  if (typeof value === "object" && value !== null) {
    for (const nested of Object.values(value)) {
      collectStrings(nested, into);
    }
  }
}

function remoteToolName(toolName: string): string {
  const separator = toolName.indexOf("__");
  return separator >= 0 ? toolName.slice(separator + 2) : toolName;
}

function isMongoDropTool(toolName: string): boolean {
  const remote = remoteToolName(toolName).toLowerCase();
  return (
    remote === "drop-database" ||
    remote === "drop-collection" ||
    remote === "drop_database" ||
    remote === "drop_collection"
  );
}

function looksLikeSqlTool(toolName: string): boolean {
  const name = toolName.toLowerCase();
  return (
    name.includes("snowflake") ||
    name.includes("toolbox") ||
    name.includes("sql") ||
    /\bquery\b/.test(name) ||
    name.includes("statement")
  );
}

function readStringField(args: object, key: string): string | null {
  if (!Object.hasOwn(args, key)) {
    return null;
  }
  const value: unknown = Reflect.get(args, key);
  return typeof value === "string" ? value : null;
}

function bashCommand(args: unknown): string {
  if (typeof args !== "object" || args === null) {
    return "";
  }
  for (const key of ["command", "cmd", "script"]) {
    const value = readStringField(args, key);
    if (value) {
      return value;
    }
  }
  return "";
}

function isRecursiveRm(command: string): boolean {
  if (!/(?:^|[\s;|&])rm\b/.test(command)) {
    return false;
  }
  if (/\s--recursive\b/.test(command)) {
    return true;
  }
  return /(?:^|[\s;|&])rm\b[\s\S]*?-[a-zA-Z]*r/.test(command);
}

function deniesShell(command: string): boolean {
  if (!command.trim()) {
    return false;
  }
  return (
    isRecursiveRm(command) ||
    MKFS.test(command) ||
    DD_DEV.test(command) ||
    FORK_BOMB.test(command) ||
    DROP_SQL.test(command) ||
    TRUNCATE_SQL.test(command) ||
    ALTER_DROP_SQL.test(command)
  );
}

function deniesSql(text: string): boolean {
  return DROP_SQL.test(text) || TRUNCATE_SQL.test(text) || ALTER_DROP_SQL.test(text);
}

export function evaluateCommandPolicy(input: {
  readonly toolName: string;
  readonly args?: unknown;
}): CommandPolicyResult {
  if (isMongoDropTool(input.toolName)) {
    return "deny";
  }

  const command = bashCommand(input.args);
  if (deniesShell(command)) {
    return "deny";
  }

  if (looksLikeSqlTool(input.toolName)) {
    const strings: string[] = [];
    collectStrings(input.args, strings);
    if (strings.some((text) => deniesSql(text))) {
      return "deny";
    }
  }

  return "allow";
}
