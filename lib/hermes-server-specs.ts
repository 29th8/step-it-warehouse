export type ServerSpecSuggestion = {
  name?: string;
  modelNumber?: string;
  vendor?: string;
  type?: string;
  description?: string;
  attributes: Record<string, string | number | boolean>;
};

type AttributeDefinitionLike = {
  key: string;
  inputType: "TEXT" | "SELECT" | "NUMBER" | "BOOLEAN";
  isActive?: boolean;
};

const STATIC_FIELD_MAP: Record<string, keyof Omit<ServerSpecSuggestion, "attributes">> = {
  name: "name",
  model: "modelNumber",
  modelNumber: "modelNumber",
  manufacturer: "vendor",
  vendor: "vendor",
  type: "type",
  description: "description",
};

const POSITIVE_INTEGER_ATTRIBUTES = new Set(["uHeight", "dimmSlots", "driveBays"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readRawSuggestions(payload: unknown) {
  if (!isPlainObject(payload)) return {};
  return isPlainObject(payload.suggestions) ? payload.suggestions : payload;
}

function normalizeStaticValue(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function normalizeAttributeValue(definition: AttributeDefinitionLike, value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;

  if (definition.inputType === "BOOLEAN") {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "yes", "co", "có", "1"].includes(normalized)) return true;
      if (["false", "no", "khong", "không", "0"].includes(normalized)) return false;
    }
    return undefined;
  }

  if (definition.inputType === "NUMBER") {
    const numericValue = typeof value === "number" ? value : Number(String(value).trim());
    if (!Number.isFinite(numericValue)) return undefined;
    if (POSITIVE_INTEGER_ATTRIBUTES.has(definition.key)) {
      if (!Number.isInteger(numericValue) || numericValue < 1) return undefined;
      return numericValue;
    }
    return numericValue;
  }

  const stringValue = String(value).trim();
  return stringValue || undefined;
}

export function normalizeHermesServerSpecResponse(
  payload: unknown,
  definitions: AttributeDefinitionLike[],
) {
  const rawSuggestions = readRawSuggestions(payload);
  const suggestion: ServerSpecSuggestion = { attributes: {} };
  const ignoredFields: string[] = [];

  for (const [rawKey, rawValue] of Object.entries(rawSuggestions)) {
    const staticKey = STATIC_FIELD_MAP[rawKey];
    if (!staticKey) continue;

    const normalizedValue = normalizeStaticValue(rawValue);
    if (normalizedValue !== undefined) {
      suggestion[staticKey] = normalizedValue;
    } else {
      ignoredFields.push(rawKey);
    }
  }

  const nestedAttributes = isPlainObject(rawSuggestions.attributes) ? rawSuggestions.attributes : {};
  const activeDefinitions = definitions.filter((definition) => definition.isActive !== false);

  for (const definition of activeDefinitions) {
    const rawValue = rawSuggestions[definition.key] ?? nestedAttributes[definition.key];
    const normalizedValue = normalizeAttributeValue(definition, rawValue);
    if (normalizedValue !== undefined) {
      suggestion.attributes[definition.key] = normalizedValue;
    } else if (rawValue !== undefined && rawValue !== null && rawValue !== "") {
      ignoredFields.push(definition.key);
    }
  }

  return {
    suggestion,
    ignoredFields: Array.from(new Set(ignoredFields)),
  };
}

export function readHermesSuccess(payload: unknown) {
  if (!isPlainObject(payload)) return true;
  return payload.success !== false;
}

export function readHermesErrorMessage(payload: unknown) {
  if (!isPlainObject(payload)) return undefined;
  if (typeof payload.message === "string") return payload.message;
  if (isPlainObject(payload.error) && typeof payload.error.message === "string") {
    return payload.error.message;
  }
  return undefined;
}

export function readHermesConfidence(payload: unknown) {
  if (!isPlainObject(payload)) return undefined;
  const value = payload.confidence;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function readHermesWarnings(payload: unknown) {
  if (!isPlainObject(payload) || !Array.isArray(payload.warnings)) return [];
  return payload.warnings.filter((warning): warning is string => typeof warning === "string");
}
