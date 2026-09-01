import type { ActionDefinition } from "@w6w/types";
import { bitFlag, compact, CrispClient, PAGE_PARAMS } from "../lib/client.ts";

interface Input {
  pageNumber: number;
  perPage?: number;
  searchQuery?: string;
  searchType?: "text" | "segment" | "filter";
  filterInboxId?: string;
  filterUnread?: boolean;
  filterResolved?: boolean;
  filterNotResolved?: boolean;
  filterAssigned?: string;
  filterUnassigned?: boolean;
}

export interface CrispConversationSummary {
  session_id?: string;
  website_id?: string;
  inbox_id?: string;
  state?: "pending" | "unresolved" | "resolved";
  is_verified?: boolean;
  is_blocked?: boolean;
  availability?: "online" | "offline";
  last_message?: string;
  topic?: string;
  created_at?: number;
  updated_at?: number;
}

/**
 * `GET /v1/website/{website_id}/conversations/{page_number}` — lists
 * conversations for the workspace. `page_number` is 1-indexed. Query params
 * verified against the reference's URI template (which lists 16 in total);
 * this covers the ones a workflow filter is most likely to need. The rest —
 * `search_operator`, `include_empty`, `filter_mention`, `filter_date_start`/
 * `filter_date_end`, `order_date_*` — are left out; see README.
 */
const listConversations: ActionDefinition<Input, CrispConversationSummary[] | undefined> = {
  key: "list-conversations",
  type: "search",
  resource: "conversation",
  title: "List Conversations",
  description: "List conversations in the workspace, paged 20-50 per page.",
  params: [
    ...PAGE_PARAMS,
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      hint: "Between 20 and 50. Defaults to 20.",
    },
    {
      key: "searchQuery",
      label: "Search query",
      type: "string",
      hint: "Text, segment name or filter string, depending on Search type.",
    },
    {
      key: "searchType",
      label: "Search type",
      type: "select",
      options: [
        { value: "text", label: "Text" },
        { value: "segment", label: "Segment" },
        { value: "filter", label: "Filter" },
      ],
    },
    { key: "filterInboxId", label: "Filter: inbox ID", type: "string" },
    { key: "filterUnread", label: "Filter: unread only", type: "boolean" },
    { key: "filterResolved", label: "Filter: resolved only", type: "boolean" },
    { key: "filterNotResolved", label: "Filter: not resolved only", type: "boolean" },
    {
      key: "filterAssigned",
      label: "Filter: assigned to operator ID",
      type: "string",
    },
    { key: "filterUnassigned", label: "Filter: unassigned only", type: "boolean" },
  ],
  output: [
    { key: "session_id", type: "string", label: "Session ID" },
    { key: "state", type: "string", label: "State" },
    { key: "last_message", type: "string", label: "Last message excerpt" },
  ],

  execute(input, ctx) {
    const client = new CrispClient(ctx);
    return client.request<CrispConversationSummary[]>(`/conversations/${input.pageNumber}`, {
      query: compact({
        per_page: input.perPage,
        search_query: input.searchQuery,
        search_type: input.searchType,
        filter_inbox_id: input.filterInboxId,
        filter_unread: bitFlag(input.filterUnread),
        filter_resolved: bitFlag(input.filterResolved),
        filter_not_resolved: bitFlag(input.filterNotResolved),
        filter_assigned: input.filterAssigned,
        filter_unassigned: bitFlag(input.filterUnassigned),
      }),
    });
  },
};

export default listConversations;
