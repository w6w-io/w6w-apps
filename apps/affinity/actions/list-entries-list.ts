import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact } from "../lib/client.ts";
import { listIdPathParam, paginationParams } from "../lib/params.ts";

/**
 * `GET /lists/{list_id}/list-entries`.
 *
 * The vendor's own shape-switching endpoint: with no `pageSize`, it answers a
 * bare array of every list entry; pass `pageSize` and it switches to
 * `{list_entries, next_page_token}`. This action always sends a `pageSize`
 * (100, well under the API's max page and far under an unbounded full-list
 * pull) so the output shape is fixed and predictable rather than depending on
 * whether the caller happened to fill in a param.
 */
interface Input {
  listId: number;
  pageSize?: number;
  pageToken?: string;
}

interface ListEntriesPage {
  list_entries: unknown[];
  next_page_token: string | null;
}

const listEntriesList: ActionDefinition<Input> = {
  key: "list-entries-list",
  type: "read",
  resource: "list-entry",
  title: "List List Entries",
  description: "Get the entries (rows) on a List, paginated.",
  params: [listIdPathParam, ...paginationParams(100)],
  output: [
    { key: "list_entries", type: "array", label: "List entries" },
    { key: "next_page_token", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    return new AffinityClient(ctx).json<ListEntriesPage>(
      `/lists/${input.listId}/list-entries`,
      { query: compact({ page_size: input.pageSize ?? 100, page_token: input.pageToken }) },
    );
  },
};

export default listEntriesList;
