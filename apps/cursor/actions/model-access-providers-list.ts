import type { ActionDefinition } from "@w6w/types";
import { CursorClient } from "../lib/client.ts";

/**
 * `GET /teams/model-access/providers` — every catalog provider and model,
 * with resolved enabled flags and per-model `parameters` (catalog-driven —
 * ids and supported values, e.g. `fast`, `reasoning`, come from the model
 * catalog, not from this app).
 *
 * Returns `409` when the team does not yet have a custom policy (`state` is
 * `unrestricted` or `legacy`) — call `model-access-configuration-update`
 * first to turn one on. Reads need `models:read` / `models:*` / `admin:*`.
 */
const modelAccessProvidersList: ActionDefinition<Record<string, never>> = {
  key: "model-access-providers-list",
  type: "read",
  resource: "model-access",
  title: "List Model Access Providers",
  description:
    "List catalog providers and models with resolved enabled flags and per-model parameters. " +
    "Returns 409 while the team has no custom model-access policy.",
  params: [],
  output: [
    { key: "teamId", type: "number", label: "Team id" },
    { key: "state", type: "string", label: "unrestricted | legacy | custom" },
    { key: "providers", type: "array", label: "Providers, each with its models" },
  ],

  execute(_input, ctx) {
    return new CursorClient(ctx).get("/teams/model-access/providers");
  },
};

export default modelAccessProvidersList;
