import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import { accountIdParam, broadcastIdParam, listIdParam } from "../lib/params.ts";

/**
 * `GET .../broadcasts/{broadcastId}/opens` — subscribers who opened a sent
 * broadcast.
 *
 * **Paginates differently from every other collection in this app.** Most
 * collections use offset paging (`ws.start`/`ws.size`); this one — and
 * `broadcast-clicks` — use a cursor pair instead: `after`/`before` (mutually
 * exclusive) plus `page_size`. There is no `ws.start` here, so "skip to
 * item 500" is not expressible; only "give me the page after/before this
 * cursor" is.
 */
interface Input {
  accountId: string;
  listId: string;
  broadcastId: string;
  after?: string;
  before?: string;
  pageSize?: number;
}

const broadcastOpens: ActionDefinition<Input> = {
  key: "broadcast-opens",
  type: "search",
  resource: "broadcast",
  title: "List Broadcast Opens",
  description: "List subscribers who opened a sent broadcast.",
  params: [
    accountIdParam,
    listIdParam,
    broadcastIdParam,
    {
      key: "after",
      label: "After cursor",
      type: "string",
      hint: "Page forward from this cursor (from a previous page's next_collection_link). " +
        "Cannot be combined with Before cursor.",
    },
    {
      key: "before",
      label: "Before cursor",
      type: "string",
      hint: "Page backward from this cursor. Cannot be combined with After cursor.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 100,
      validation: { integer: true, min: 1, max: 100 },
    },
  ],
  output: [{ key: "entries", type: "array", label: "Opens" }],

  execute(input, ctx) {
    const { accountId, listId, broadcastId } = input;
    return new AweberClient(ctx).list<Record<string, unknown>>(
      `/accounts/${encodeId(accountId)}/lists/${encodeId(listId)}/broadcasts/${
        encodeId(broadcastId)
      }/opens`,
      { after: input.after, before: input.before, page_size: input.pageSize },
    );
  },
};

export default broadcastOpens;
