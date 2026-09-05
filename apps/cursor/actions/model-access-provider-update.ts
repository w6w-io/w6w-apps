import type { ActionDefinition } from "@w6w/types";
import { CursorClient, encodeId } from "../lib/client.ts";
import { providerIdParam } from "../lib/params.ts";

interface Input {
  provider: string;
  enabled: boolean;
}

/**
 * `PUT /teams/model-access/providers/:provider` — enable or disable an
 * entire provider. Returns `409` when the team is still `unrestricted` or
 * `legacy` — a custom policy must exist first (`model-access-configuration-update`).
 *
 * The doc gives the request but no example response body for this specific
 * route; `execute` returns whatever Cursor answers rather than a narrowed
 * shape invented for it.
 */
const modelAccessProviderUpdate: ActionDefinition<Input> = {
  key: "model-access-provider-update",
  type: "perform",
  resource: "model-access",
  title: "Update Model Access Provider",
  description:
    "Enable or disable a whole provider. Returns 409 while the team has no custom model-access " +
    "policy.",
  idempotent: true,
  params: [
    providerIdParam,
    { key: "enabled", label: "Enabled", type: "boolean", required: true },
  ],
  output: [
    { key: "result", type: "object", label: "The updated provider" },
  ],

  execute(input, ctx) {
    return new CursorClient(ctx).put(
      `/teams/model-access/providers/${encodeId(input.provider)}`,
      { enabled: input.enabled },
    );
  },
};

export default modelAccessProviderUpdate;
