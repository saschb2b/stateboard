/** Validates the JSON Schema subset used by our tool catalog; DB rules remain authoritative. */
export function mcpArgumentsError(
  schema: Record<string, unknown>,
  value: unknown,
  path = "arguments",
  depth = 0,
): string | null {
  if (depth > 24) return `${path} exceeds the nesting limit`;
  const child = (rule: Record<string, unknown>, item: unknown, name: string) =>
    mcpArgumentsError(rule, item, name, depth + 1);
  for (const keyword of ["anyOf", "oneOf"] as const) {
    const choices = schema[keyword];
    if (Array.isArray(choices)) {
      const matches = choices.filter((rule) => !child(rule, value, path));
      if (matches.length === 0 || (keyword === "oneOf" && matches.length !== 1))
        return `${path} must match ${keyword === "oneOf" ? "exactly one" : "a"} supported shape`;
    }
  }
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  const matchesType = (type: unknown): boolean => {
    switch (type) {
      case undefined:
        return true;
      case "null":
        return value === null;
      case "array":
        return Array.isArray(value);
      case "object":
        return (
          value !== null && typeof value === "object" && !Array.isArray(value)
        );
      case "integer":
        return typeof value === "number" && Number.isSafeInteger(value);
      case "number":
        return typeof value === "number" && Number.isFinite(value);
      case "string":
        return typeof value === "string";
      case "boolean":
        return typeof value === "boolean";
      default:
        return false;
    }
  };
  if (!types.some(matchesType)) return `${path} must be ${types.join(" or ")}`;
  if ("const" in schema && value !== schema.const)
    return `${path} has an unsupported value`;
  if (Array.isArray(schema.enum) && !schema.enum.includes(value))
    return `${path} must be one of ${schema.enum.join(", ")}`;
  if (typeof value === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum)
      return `${path} must be at least ${schema.minimum}`;
    if (typeof schema.maximum === "number" && value > schema.maximum)
      return `${path} must be at most ${schema.maximum}`;
  }
  if (typeof value === "string") {
    if (typeof schema.minLength === "number" && value.length < schema.minLength)
      return `${path} is too short`;
    if (typeof schema.maxLength === "number" && value.length > schema.maxLength)
      return `${path} is too long`;
    if (
      typeof schema.pattern === "string" &&
      !new RegExp(schema.pattern).test(value)
    )
      return `${path} has an invalid format`;
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems)
      return `${path} needs at least ${schema.minItems} items`;
    if (typeof schema.maxItems === "number" && value.length > schema.maxItems)
      return `${path} exceeds ${schema.maxItems} items`;
    if (
      schema.uniqueItems &&
      new Set(value.map((item) => JSON.stringify(item))).size !== value.length
    )
      return `${path} must not contain duplicates`;
    if (schema.items && typeof schema.items === "object") {
      for (const [index, item] of value.entries()) {
        const error = child(
          schema.items as Record<string, unknown>,
          item,
          `${path}[${index}]`,
        );
        if (error) return error;
      }
    }
  } else if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    const properties = (schema.properties ?? {}) as Record<
      string,
      Record<string, unknown>
    >;
    for (const field of (schema.required ?? []) as string[])
      if (!Object.hasOwn(object, field)) return `${path}.${field} is required`;
    for (const [field, item] of Object.entries(object)) {
      if (!Object.hasOwn(properties, field)) {
        if (schema.additionalProperties === false)
          return `${path}.${field} is not supported`;
        continue;
      }
      const error = child(properties[field]!, item, `${path}.${field}`);
      if (error) return error;
    }
  }
  return null;
}
