const CUSTOM_MODEL_ID_PREFIX = "custom:";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function customModelSelectableId(rowId: string): string {
  return `${CUSTOM_MODEL_ID_PREFIX}${rowId}`;
}

export function parseCustomModelRowId(selectableId: string): string | null {
  if (!selectableId.startsWith(CUSTOM_MODEL_ID_PREFIX)) {
    return null;
  }
  const rowId = selectableId.slice(CUSTOM_MODEL_ID_PREFIX.length).trim();
  if (!UUID_RE.test(rowId)) {
    return null;
  }
  return rowId;
}

export function isCustomModelSelectableId(value: string): boolean {
  return parseCustomModelRowId(value) !== null;
}
