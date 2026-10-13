/** JSON Schema primitives shared by the release-readiness MCP catalog. */
export const idProperty = {
  type: "string",
  minLength: 1,
  maxLength: 200,
  pattern: "^[A-Za-z0-9_-]+$",
} as const;

export const textProperty = (maxLength = 200, minLength = 1) => ({
  type: "string",
  minLength,
  maxLength,
});
export const nullableTextProperty = (maxLength = 200) => ({
  type: ["string", "null"],
  maxLength,
});
export const referenceProperty = {
  ...nullableTextProperty(2000),
  description:
    "HTTP(S) reference without embedded credentials. Stored only; never fetched.",
};
export const revisionProperty = {
  type: "integer",
  minimum: 1,
  maximum: Number.MAX_SAFE_INTEGER,
  description:
    "Current assessment.revision from the latest read or write. On conflict, refresh and reconcile before retrying.",
};
export const objectSchema = (
  properties: Record<string, unknown>,
  required: string[] = [],
) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
export const productInput = (
  properties: Record<string, unknown>,
  required: string[] = [],
) =>
  objectSchema({ board_id: idProperty, ...properties }, [
    "board_id",
    ...required,
  ]);
export const releaseInput = (
  properties: Record<string, unknown>,
  required: string[] = [],
) =>
  objectSchema(
    {
      release_id: idProperty,
      expected_revision: revisionProperty,
      ...properties,
    },
    ["release_id", "expected_revision", ...required],
  );
