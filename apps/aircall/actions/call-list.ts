import type { ActionDefinition } from "@w6w/types";
import { AircallClient, flag } from "../lib/client.ts";
import {
  type CallExpansionInput,
  callExpansionParams,
  listOutput,
  listResult,
  type PaginationInput,
  paginationParams,
  paginationQuery,
  type WindowInput,
  windowParams,
  windowQuery,
} from "../lib/params.ts";

type Input = PaginationInput & WindowInput & CallExpansionInput;

/**
 * `GET /v1/calls` — the company's Calls, newest-last by default.
 *
 * Two limits worth knowing before you build a sync on this:
 *
 *  - **Only six months of history is available.** Aircall's own note; older
 *    calls need a one-time export requested from their support team.
 *  - **Pagination tops out at 10,000 Calls**, whatever `meta.total` says. The
 *    vendor's remedy is to narrow the window with `from` rather than to page
 *    deeper, which is why `from`/`to` are first-class params here.
 *
 * Ordering is ascending (oldest first) by default, which is what makes paging
 * safe while new calls are arriving; `order: desc` is the right choice for "what
 * happened recently" and the wrong one for a backfill.
 */
const callList: ActionDefinition<Input> = {
  key: "call-list",
  type: "read",
  resource: "call",
  title: "List Calls",
  description:
    "List the company's Calls with their user, number, comments and tags. Six months of history; " +
    "10,000 records reachable by paging.",
  params: [
    ...windowParams("Calls"),
    ...callExpansionParams(),
    ...paginationParams(),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    const { meta, items } = await client.list<Record<string, unknown>>("/calls", "calls", {
      query: {
        ...windowQuery(input),
        ...paginationQuery(input),
        fetch_contact: flag(input.fetchContact),
        fetch_short_urls: flag(input.fetchShortUrls),
        fetch_call_timeline: flag(input.fetchCallTimeline),
        fetch_aiva_conv: flag(input.fetchAivaConv),
      },
    });
    ctx.log("info", "listed calls", { count: items.length, total: meta.total });
    return listResult(meta, items);
  },
};

export default callList;
