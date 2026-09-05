import type { ActionDefinition } from "@w6w/types";
import { SenderClient, type SenderListPage } from "../lib/client.ts";

/**
 * `GET /v2/segments/` — all segments in the account.
 *
 * Sender's API has no documented segment-CREATE endpoint anywhere in the
 * crawled sitemap (only delete/get/list/subscribers pages exist under
 * `segments/`) — segments are built in the Sender web app and only read here.
 */
type Input = Record<string, never>;

const segmentList: ActionDefinition<Input> = {
  key: "segment-list",
  type: "search",
  resource: "segment",
  title: "List Segments",
  description: "List all segments in the account. Segments are created in the Sender app; the " +
    "API exposes no create-segment endpoint.",
  output: [
    { key: "data", type: "array", label: "Segments" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(_input, ctx) {
    return new SenderClient(ctx).json<SenderListPage<unknown>>("/segments/");
  },
};

export default segmentList;
