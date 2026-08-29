import type { ActionDefinition } from "@w6w/types";
import { compact, HunterClient } from "../lib/client.ts";

/**
 * `GET /v2/leads_lists` — list saved leads lists, most recent first. Free.
 *
 * Note the underscore: `leads_lists`, unlike `lead-list`'s hyphenated
 * `/leads`. Each list carries a `type`: `static` lists hold whatever leads
 * you save into them; `dynamic` lists are filter-defined, and a lead saved
 * into one will not show up there — save into `static` lists only.
 */
interface Input {
  limit?: number;
  offset?: number;
}

const leadsListList: ActionDefinition<Input> = {
  key: "leads-list-list",
  type: "search",
  resource: "leads-list",
  title: "List Leads Lists",
  description: "List saved leads lists, most recent first. Free.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 20,
      hint: "1–100. Default 20.",
    },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "data", type: "object", label: "leads_lists[]" },
    { key: "meta", type: "object", label: "total, params echo" },
  ],

  execute(input, ctx) {
    return new HunterClient(ctx).request("/leads_lists", {
      query: compact({ limit: input.limit, offset: input.offset }),
    });
  },
};

export default leadsListList;
