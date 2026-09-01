import type { ActionDefinition } from "@w6w/types";
import { HoldedClient } from "../lib/client.ts";

/**
 * `GET /funnels` — every sales funnel (customizable pipeline) on the account.
 *
 * The spec documents no query parameter of any kind on this endpoint — no
 * page, no limit, no filter — so this returns the account's full set of
 * funnels in one call.
 *
 * Each funnel carries its own `stages` (the pipeline steps a business defined
 * for itself), running totals (`won`, `leads`, `lost`), and the most recent
 * lead ids in each bucket (`recentWon`, `recentLeads`, `recentLost`) — useful
 * for a quick glance without a separate Leads read.
 */
type Input = Record<string, never>;

const funnelList: ActionDefinition<Input> = {
  key: "funnel-list",
  type: "read",
  resource: "funnel",
  title: "List Funnels",
  description: "Get all of the account's sales funnels.",
  params: [],
  output: [{ key: "funnels", type: "array", label: "Funnels" }],

  async execute(_input, ctx) {
    const funnels = await new HoldedClient(ctx).get<unknown[]>("/funnels");
    return { funnels };
  },
};

export default funnelList;
