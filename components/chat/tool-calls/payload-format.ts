export const MAX_FORMATTED_PAYLOAD_LENGTH = 4_000;

const MAX_DEPTH = 5;
const MAX_ENTRIES = 40;
const MAX_NODES = 240;
const MAX_STRING_LENGTH = 600;
const TRUNCATED = "[truncated]";

type SerializationBudget = {
  remaining: number;
  truncated: boolean;
};

function truncateString(value: string, budget: SerializationBudget): string {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }

  budget.truncated = true;
  return `${value.slice(0, MAX_STRING_LENGTH)}… ${TRUNCATED}`;
}

function prepareValue(
  value: unknown,
  depth: number,
  budget: SerializationBudget,
  seen: WeakSet<object>,
): unknown {
  if (budget.remaining <= 0) {
    budget.truncated = true;
    return TRUNCATED;
  }
  budget.remaining -= 1;

  if (typeof value === "string") {
    return truncateString(value, budget);
  }
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "undefined"
  ) {
    return value;
  }
  if (typeof value === "bigint" || typeof value === "symbol" || typeof value === "function") {
    return String(value);
  }
  if (depth >= MAX_DEPTH) {
    budget.truncated = true;
    return TRUNCATED;
  }
  if (seen.has(value)) {
    budget.truncated = true;
    return "[circular]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const entries = value
      .slice(0, MAX_ENTRIES)
      .map((entry) => prepareValue(entry, depth + 1, budget, seen));
    if (value.length > MAX_ENTRIES) {
      budget.truncated = true;
      entries.push(TRUNCATED);
    }
    return entries;
  }

  const entries = Object.entries(value);
  const prepared: Record<string, unknown> = {};
  for (const [key, entry] of entries.slice(0, MAX_ENTRIES)) {
    prepared[key] = prepareValue(entry, depth + 1, budget, seen);
  }
  if (entries.length > MAX_ENTRIES) {
    budget.truncated = true;
    prepared["…"] = TRUNCATED;
  }
  return prepared;
}

export function formatPayload(value: unknown): string {
  if (typeof value === "string" && value.length <= MAX_FORMATTED_PAYLOAD_LENGTH) {
    return value;
  }

  const budget: SerializationBudget = { remaining: MAX_NODES, truncated: false };
  const prepared = prepareValue(value, 0, budget, new WeakSet<object>());
  let output: string;

  try {
    output = typeof prepared === "string" ? prepared : JSON.stringify(prepared, null, 2);
  } catch {
    output = String(prepared);
  }

  if (budget.truncated && !output.includes(TRUNCATED)) {
    output = `${output}\n${TRUNCATED}`;
  }
  if (output.length <= MAX_FORMATTED_PAYLOAD_LENGTH) {
    return output;
  }

  const suffix = `\n${TRUNCATED}`;
  return `${output.slice(0, MAX_FORMATTED_PAYLOAD_LENGTH - suffix.length)}${suffix}`;
}
