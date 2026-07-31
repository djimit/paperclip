/**
 * @fileoverview Validates plugin instance configuration against its JSON Schema.
 *
 * Uses Ajv to validate `configJson` values against the `instanceConfigSchema`
 * declared in a plugin's manifest. This ensures that invalid configuration is
 * rejected at the API boundary, not discovered later at worker startup.
 *
 * @module server/services/plugin-config-validator
 */

import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import type { JsonSchema } from "@paperclipai/shared";

export interface ConfigValidationResult {
  valid: boolean;
  errors?: { field: string; message: string }[];
}

const MAX_SCHEMA_DEPTH = 64;
const MAX_SCHEMA_NODES = 10_000;

function schemaWithinTraversalBudget(schema: unknown) {
  const pending: Array<{ value: unknown; depth: number }> = [{ value: schema, depth: 0 }];
  const seen = new WeakSet<object>();
  let nodes = 0;
  while (pending.length > 0) {
    const { value, depth } = pending.pop()!;
    if (!value || typeof value !== "object" || seen.has(value)) continue;
    if (depth > MAX_SCHEMA_DEPTH || ++nodes > MAX_SCHEMA_NODES) return false;
    seen.add(value);
    for (const nested of Array.isArray(value) ? value : Object.values(value)) {
      pending.push({ value: nested, depth: depth + 1 });
    }
  }
  return true;
}

/**
 * Validate a config object against a JSON Schema.
 *
 * @param configJson - The configuration values to validate.
 * @param schema - The JSON Schema from the plugin manifest's `instanceConfigSchema`.
 * @returns Validation result with structured field errors on failure.
 */
export function validateInstanceConfig(
  configJson: Record<string, unknown>,
  schema: JsonSchema,
): ConfigValidationResult {
  if (!schemaWithinTraversalBudget(schema)) {
    return { valid: false, errors: [{ field: "/", message: "configuration schema is too deeply nested or complex" }] };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AjvCtor = (Ajv as any).default ?? Ajv;
  const ajv = new AjvCtor({ allErrors: true });
  // ajv-formats v3 default export is a FormatsPlugin object; call it as a plugin.
  const applyFormats = (addFormats as any).default ?? addFormats;
  applyFormats(ajv);
  // Register the secret-ref format used by plugin manifests to mark fields that
  // hold a Paperclip secret UUID rather than a raw value. The format is a UI
  // hint only — UUID validation happens in the secrets handler at resolve time.
  ajv.addFormat("secret-ref", { validate: () => true });
  const validate = ajv.compile(schema);
  const valid = validate(configJson);

  if (valid) {
    return { valid: true };
  }

  const errors = (validate.errors ?? []).map((err: ErrorObject) => ({
    field: err.instancePath || "/",
    message: err.message ?? "validation failed",
  }));

  return { valid: false, errors };
}
