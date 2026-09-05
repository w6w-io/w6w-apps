import type { ActionDefinition } from "@w6w/types";
import { CursorClient, encodeId } from "../lib/client.ts";
import { modelIdParam, providerIdParam } from "../lib/params.ts";

interface Input {
  provider: string;
  model: string;
  enabled: boolean;
  parameters?:
    | Record<string, { allowedValues?: string[] | null; defaultValue?: string | null }>
    | string;
}

/**
 * `PUT /teams/model-access/providers/:provider/models/:model` — enable or
 * disable a single model, and optionally restrict which values members may
 * pick for a catalog parameter (e.g. `fast`, `reasoning`) and/or pin a
 * team-wide default for it.
 *
 * `parameters` is a map from parameter id to `{allowedValues, defaultValue}`;
 * omitted parameters and omitted fields within a parameter are left
 * unchanged. Pass `allowedValues: null` (or `defaultValue: null`) to clear
 * that restriction and fall back to the catalog default — this is how the
 * doc's own "clear a restriction" example works, so `null` is sent through
 * verbatim rather than treated as "unset".
 *
 * Returns `409` while the team is still `unrestricted`/`legacy`, and `400`
 * for an unknown provider/model/parameter/value, an empty `allowedValues`,
 * a default outside `allowedValues`, or settings resolving to no valid model
 * variant.
 */
const modelAccessModelUpdate: ActionDefinition<Input> = {
  key: "model-access-model-update",
  type: "perform",
  resource: "model-access",
  title: "Update Model Access Model",
  description:
    "Enable or disable a single model, and optionally set per-model parameter restrictions and " +
    "a team default. Returns 409 while the team has no custom model-access policy.",
  idempotent: true,
  params: [
    providerIdParam,
    modelIdParam,
    { key: "enabled", label: "Enabled", type: "boolean", required: true },
    {
      key: "parameters",
      label: "Parameters",
      type: "json",
      hint: 'Map of parameter id to { "allowedValues": string[] | null, "defaultValue": string | ' +
        'null }, e.g. { "reasoning": { "allowedValues": ["low","medium","high"], "defaultValue": ' +
        '"high" } }. Pass null to clear a restriction. Omitted parameters/fields are left ' +
        "unchanged.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Model id" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "enabled", type: "boolean", label: "Enabled" },
    { key: "provider", type: "string", label: "Provider id" },
    { key: "parameters", type: "array", label: "Resolved parameter settings" },
  ],

  execute(input, ctx) {
    const parameters = typeof input.parameters === "string"
      ? JSON.parse(input.parameters)
      : input.parameters;
    return new CursorClient(ctx).put(
      `/teams/model-access/providers/${encodeId(input.provider)}/models/${encodeId(input.model)}`,
      { enabled: input.enabled, ...(parameters ? { parameters } : {}) },
    );
  },
};

export default modelAccessModelUpdate;
