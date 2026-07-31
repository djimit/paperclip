import { describe, expect, it } from "vitest";
import { validateInstanceConfig } from "../services/plugin-config-validator.ts";

describe("validateInstanceConfig", () => {
  it("accepts ordinary schemas and rejects excessive nesting before Ajv traversal", () => {
    expect(validateInstanceConfig({ name: "ok" }, {
      type: "object",
      properties: { name: { type: "string" } },
    })).toEqual({ valid: true });

    let schema: Record<string, unknown> = { type: "string" };
    for (let depth = 0; depth < 100; depth += 1) {
      schema = { type: "object", properties: { nested: schema } };
    }
    expect(validateInstanceConfig({}, schema).valid).toBe(false);
  });
});
