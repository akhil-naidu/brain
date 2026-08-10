export type CustomModelScope = "instance" | "workspace";

export type CustomModelRecord = {
  readonly id: string;
  readonly scope: CustomModelScope;
  readonly workspaceId: string | null;
  readonly label: string;
  readonly description: string;
  readonly baseUrl: string;
  readonly providerModelId: string;
  readonly contextWindowTokens: number;
  readonly hasApiKey: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** Internal row including ciphertext for agent resolution. */
export type CustomModelSecretRow = CustomModelRecord & {
  readonly apiKeyCiphertext: string | null;
};

export type CreateCustomModelInput = {
  readonly scope: CustomModelScope;
  readonly workspaceId?: string | null;
  readonly label: string;
  readonly description?: string;
  readonly baseUrl: string;
  readonly providerModelId: string;
  readonly contextWindowTokens: number;
  readonly apiKey?: string | null;
};

export type UpdateCustomModelInput = {
  readonly label?: string;
  readonly description?: string;
  readonly baseUrl?: string;
  readonly providerModelId?: string;
  readonly contextWindowTokens?: number;
  /** `undefined` keeps existing; `null` or `""` clears; non-empty replaces. */
  readonly apiKey?: string | null;
};
