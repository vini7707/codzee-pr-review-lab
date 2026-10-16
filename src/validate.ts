export type ConfigSchema =
  | { type: "string"; minLength?: number; maxLength?: number; pattern?: RegExp }
  | { type: "number"; minimum?: number; maximum?: number; integer?: boolean }
  | { type: "boolean" }
  | { type: "array"; items: ConfigSchema; minItems?: number; maxItems?: number }
  | { type: "object"; properties: Record<string, ConfigSchema>; required?: string[]; additionalProperties?: boolean };

export interface ConfigIssue { path: string; code: string; message: string }

/** Return every schema mismatch, using JSON Pointer paths for nested values. */
export function validateConfig(value: unknown, schema: ConfigSchema): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  const visit = (current: unknown, rule: ConfigSchema, path: string): void => {
    if (rule.type === "string") {
      if (typeof current !== "string") { issues.push({ path, code: "type", message: "Expected a string" }); return; }
      if (rule.minLength !== undefined && current.length < rule.minLength) issues.push({ path, code: "minLength", message: `Must contain at least ${rule.minLength} characters` });
      if (rule.maxLength !== undefined && current.length > rule.maxLength) issues.push({ path, code: "maxLength", message: `Must contain at most ${rule.maxLength} characters` });
      if (rule.pattern && !rule.pattern.test(current)) issues.push({ path, code: "pattern", message: "Does not match the required pattern" });
    } else if (rule.type === "number") {
      if (typeof current !== "number" || !Number.isFinite(current)) { issues.push({ path, code: "type", message: "Expected a finite number" }); return; }
      if (rule.integer && !Number.isInteger(current)) issues.push({ path, code: "integer", message: "Expected an integer" });
      if (rule.minimum !== undefined && current < rule.minimum) issues.push({ path, code: "minimum", message: `Must be at least ${rule.minimum}` });
      if (rule.maximum !== undefined && current > rule.maximum) issues.push({ path, code: "maximum", message: `Must be at most ${rule.maximum}` });
    } else if (rule.type === "boolean") {
      if (typeof current !== "boolean") issues.push({ path, code: "type", message: "Expected a boolean" });
    } else if (rule.type === "array") {
      if (!Array.isArray(current)) { issues.push({ path, code: "type", message: "Expected an array" }); return; }
      if (rule.minItems !== undefined && current.length < rule.minItems) issues.push({ path, code: "minItems", message: `Must contain at least ${rule.minItems} items` });
      if (rule.maxItems !== undefined && current.length > rule.maxItems) issues.push({ path, code: "maxItems", message: `Must contain at most ${rule.maxItems} items` });
      current.forEach((item, index) => visit(item, rule.items, `${path}/${index}`));
    } else {
      if (current === null || typeof current !== "object" || Array.isArray(current)) { issues.push({ path, code: "type", message: "Expected an object" }); return; }
      const record = current as Record<string, unknown>;
      for (const key of rule.required ?? []) if (!Object.prototype.hasOwnProperty.call(record, key)) issues.push({ path: `${path}/${escapePointer(key)}`, code: "required", message: "Required property is missing" });
      for (const [key, child] of Object.entries(rule.properties)) {
        if (Object.prototype.hasOwnProperty.call(record, key)) visit(record[key], child, `${path}/${escapePointer(key)}`);
      }
      if (rule.additionalProperties === false) for (const key of Object.keys(record)) if (!Object.prototype.hasOwnProperty.call(rule.properties, key)) issues.push({ path: `${path}/${escapePointer(key)}`, code: "additionalProperty", message: "Property is not allowed" });
    }
  };
  visit(value, schema, "");
  return issues;
}

function escapePointer(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}
