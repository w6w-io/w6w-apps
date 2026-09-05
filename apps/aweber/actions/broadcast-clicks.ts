import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import { accountIdParam, broadcastIdParam, listIdParam } from "../lib/params.ts";

/**
 * `GET .../broadcasts/{broadcastId}/clicks` — aggregated unique clicks per
 * subscriber for a sent broadcast. Uses the same cursor pagination
 * (`after`/`before`/`page_size`) as `broadcast-opens` — see that action's
 * doc comment for why it differs from the rest of this app.
 */
interface Input {
  accountId: string;
  listId: string;
  broadcastId: string;
  after?: string;
  before?: string;
  pageSize?: number;
}

const broadcastClicks: ActionDefinition<Input> = {
  key: "broadcast-clicks",
  type: "search",
  resource: "broadcast",
  title: "List Broadcast Clicks",
  description: "List aggregated per-subscriber clicks for a sent broadcast.",
  params: [
    accountIdParam,
    listIdParam,
    broadcastIdParam,
    { key: "after", label: "After cursor", type: "string" },
    { key: "before", label: "Before cursor", type: "string" },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1, max: 100 },
    },
  ],
  output: [{ key: "entries", type: "array", label: "Clicks" }],

  execute(input, ctx) {
    const { accountId, listId, broadcastId } = input;
    return new AweberClient(ctx).list<Record<string, unknown>>(
      `/accounts/${encodeId(accountId)}/lists/${encodeId(listId)}/broadcasts/${
        encodeId(broadcastId)
      }/clicks`,
      { after: input.after, before: input.before, page_size: input.pageSize },
    );
  },
};

export default broadcastClicks;
