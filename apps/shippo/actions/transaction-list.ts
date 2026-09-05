import type { ActionDefinition } from "@w6w/types";
import { compact, ShippoClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/** `GET /transactions` — list label purchases on this account. */
const action: ActionDefinition = {
  key: "transaction-list",
  type: "read",
  resource: "transaction",
  title: "List transactions",
  description: "List label purchases (transactions) on this account.",
  params: [...LIST_PARAMS],
  output: [
    { key: "results", type: "array", label: "Transactions" },
    { key: "next", type: "string", label: "URL of the next page, if any" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const list = await new ShippoClient(ctx).request("/transactions", {
      query: compact({ results: p.results, page: p.page }),
    }) as { results?: unknown[]; next?: string | null };

    ctx.log("info", "listed Shippo transactions", { count: list?.results?.length ?? 0 });
    return list;
  },
};

export default action;
