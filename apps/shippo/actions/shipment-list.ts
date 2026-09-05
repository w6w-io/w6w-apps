import type { ActionDefinition } from "@w6w/types";
import { compact, ShippoClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/** `GET /shipments` — list shipments, most recent activity first. */
const action: ActionDefinition = {
  key: "shipment-list",
  type: "read",
  resource: "shipment",
  title: "List shipments",
  description: "List shipments on this account.",
  params: [...LIST_PARAMS],
  output: [
    { key: "results", type: "array", label: "Shipments" },
    { key: "next", type: "string", label: "URL of the next page, if any" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const list = await new ShippoClient(ctx).request("/shipments", {
      query: compact({ results: p.results, page: p.page }),
    }) as { results?: unknown[]; next?: string | null };

    ctx.log("info", "listed Shippo shipments", { count: list?.results?.length ?? 0 });
    return list;
  },
};

export default action;
