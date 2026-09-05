import type { ActionDefinition } from "@w6w/types";
import { CursorClient } from "../lib/client.ts";

/**
 * `GET /teams/model-access/configuration` — whether the team has a custom
 * model-access policy (`state`: `unrestricted` | `legacy` | `custom`) and the
 * defaults applied to newly-seen providers/models.
 *
 * Model access routes are documented as **preview** — "Paths, response
 * fields, and error behavior can shift before general availability." Reads
 * need the `models:read` scope (or `models:*` / `admin:*`); this app's own
 * connection expects `admin:*` (see `auth/basic.ts`).
 */
const modelAccessConfigurationGet: ActionDefinition<Record<string, never>> = {
  key: "model-access-configuration-get",
  type: "read",
  resource: "model-access",
  title: "Get Model Access Configuration",
  description:
    "Read whether the team has a custom model-access policy, and the defaults for newly seen " +
    "providers and models. Preview route.",
  params: [],
  output: [
    { key: "teamId", type: "number", label: "Team id" },
    { key: "state", type: "string", label: "unrestricted | legacy | custom" },
    { key: "newProviderDefault", type: "string", label: "Default applied to a new provider" },
    { key: "newModelDefault", type: "string", label: "Default applied to a new model" },
  ],

  execute(_input, ctx) {
    return new CursorClient(ctx).get("/teams/model-access/configuration");
  },
};

export default modelAccessConfigurationGet;
