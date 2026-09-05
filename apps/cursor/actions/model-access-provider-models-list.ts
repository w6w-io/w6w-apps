import type { ActionDefinition } from "@w6w/types";
import { CursorClient, encodeId } from "../lib/client.ts";
import { providerIdParam } from "../lib/params.ts";

interface Input {
  provider: string;
}

/**
 * `GET /teams/model-access/providers/:provider/models` — models for one
 * provider, with resolved enabled flags and per-model `parameters`. The doc
 * states its parameter fields "match the providers response" rather than
 * giving this specific route its own example body, so `execute` returns
 * Cursor's response unmodified.
 *
 * Returns `409` when the team does not have a custom model-access policy.
 */
const modelAccessProviderModelsList: ActionDefinition<Input> = {
  key: "model-access-provider-models-list",
  type: "read",
  resource: "model-access",
  title: "List Models for a Provider",
  description:
    "List one provider's models with resolved enabled flags and per-model parameters. Returns " +
    "409 while the team has no custom model-access policy.",
  params: [providerIdParam],
  output: [
    { key: "result", type: "object", label: "The provider's models" },
  ],

  execute(input, ctx) {
    return new CursorClient(ctx).get(
      `/teams/model-access/providers/${encodeId(input.provider)}/models`,
    );
  },
};

export default modelAccessProviderModelsList;
