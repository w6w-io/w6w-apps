import type { ActionDefinition } from "@w6w/types";
import { HoldedClient } from "../lib/client.ts";

/**
 * `GET /leads` — every lead (opportunity) across every funnel on the account.
 *
 * No query parameter is documented — no page, no `funnelId` filter, no
 * `stageId` filter — so this returns the account's full set of leads in one
 * call. Each lead carries its own `events` (notes and calendar events) and
 * `tasks` inline.
 */
type Input = Record<string, never>;

const leadList: ActionDefinition<Input> = {
  key: "lead-list",
  type: "read",
  resource: "lead",
  title: "List Leads",
  description: "Get all of the account's leads, across every funnel.",
  params: [],
  output: [{ key: "leads", type: "array", label: "Leads" }],

  async execute(_input, ctx) {
    const leads = await new HoldedClient(ctx).get<unknown[]>("/leads");
    return { leads };
  },
};

export default leadList;
