import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import { accountIdParam, listIdParam, paginationParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /accounts/{accountId}/lists/{listId}/segments` — a list's saved
 * segments (including split-test segments, flagged by `is_split_test`).
 * A segment's `self_link` is what `broadcast-create`'s "Segment self_link"
 * param expects.
 */
interface Input {
  accountId: string;
  listId: string;
  start?: number;
  size?: number;
}

const segmentList: ActionDefinition<Input> = {
  key: "segment-list",
  type: "search",
  resource: "segment",
  title: "List Segments",
  description: "List the saved segments on a list.",
  params: [accountIdParam, listIdParam, ...paginationParams()],
  output: [{ key: "entries", type: "array", label: "Segments" }],

  execute(input, ctx) {
    return new AweberClient(ctx).list<Record<string, unknown>>(
      `/accounts/${encodeId(input.accountId)}/lists/${encodeId(input.listId)}/segments`,
      paginationQuery(input),
    );
  },
};

export default segmentList;
