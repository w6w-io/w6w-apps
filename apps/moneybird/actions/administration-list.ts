import type { ActionDefinition } from "@w6w/types";
import { fetchAdministrations } from "../lib/client.ts";

/**
 * `GET /administrations.json` — the one endpoint with no `:administration_id`
 * in its path. Lists every administration this credential can reach, which
 * is exactly what `auth/*.ts`'s `afterConnect` already used to pick the
 * default every other action falls back to — exposed here as a read action so
 * a workflow can discover or confirm ids for the `administrationId` override
 * param that every other action accepts.
 */
const administrationList: ActionDefinition<Record<string, never>> = {
  key: "administration-list",
  type: "read",
  resource: "administration",
  title: "List Administrations",
  description: "List the Moneybird administrations (bookkeeping entities) this connection can " +
    "access.",
  params: [],
  output: [{ key: "items", type: "array", label: "Administrations" }],

  async execute(_input, ctx) {
    const items = await fetchAdministrations(ctx);
    return { items };
  },
};

export default administrationList;
