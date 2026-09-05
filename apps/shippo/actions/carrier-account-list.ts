import type { ActionDefinition } from "@w6w/types";
import { compact, ShippoClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /carrier_accounts` — list the carrier accounts connected to this
 * Shippo account, e.g. to filter `shipment-create`'s Carrier Accounts field
 * to a specific set rather than rating against all of them.
 *
 * Registering a new carrier account is left out: it is a dashboard-level,
 * often OAuth-driven flow per carrier rather than a workflow step.
 */
const action: ActionDefinition = {
  key: "carrier-account-list",
  type: "read",
  resource: "carrier-account",
  title: "List carrier accounts",
  description: "List the carrier accounts connected to this Shippo account.",
  params: [...LIST_PARAMS],
  output: [
    { key: "results", type: "array", label: "Carrier accounts" },
    { key: "next", type: "string", label: "URL of the next page, if any" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const list = await new ShippoClient(ctx).request("/carrier_accounts", {
      query: compact({ results: p.results, page: p.page }),
    }) as { results?: unknown[]; next?: string | null };

    ctx.log("info", "listed Shippo carrier accounts", { count: list?.results?.length ?? 0 });
    return list;
  },
};

export default action;
