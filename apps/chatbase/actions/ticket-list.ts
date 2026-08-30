import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient, compact, toCommaList } from "../lib/client.ts";
import {
  agentIdParam,
  paginationParams,
  paginationQuery,
  ticketChannelOptions,
  ticketStatusCategoryOptions,
} from "../lib/params.ts";

/**
 * `GET /agents/{agentId}/helpdesk/tickets` — sorted by `updatedAt` descending
 * by default. Filters combine with AND. `pagination.total` is present only
 * when `includeTotal` is on, since it costs an extra count query.
 */
interface Input {
  agentId: string;
  cursor?: string;
  limit?: number;
  status?: string[] | string;
  channel?: string[] | string;
  assigneeId?: string;
  teamId?: string;
  createdAfter?: string;
  createdBefore?: string;
  sortBy?: "createdAt" | "updatedAt" | "lastMessageAt";
  order?: "asc" | "desc";
  includeTotal?: boolean;
}

const ticketList: ActionDefinition<Input> = {
  key: "ticket-list",
  type: "read",
  resource: "ticket",
  title: "List Tickets",
  description:
    "List helpdesk tickets for an agent, with filters and cursor pagination. Filters combine " +
    "with AND.",
  params: [
    agentIdParam,
    ...paginationParams(),
    {
      key: "status",
      label: "Status categories",
      type: "multiselect",
      options: ticketStatusCategoryOptions,
      hint: "Is-any-of. Leave empty for every status.",
    },
    {
      key: "channel",
      label: "Channels",
      type: "multiselect",
      options: ticketChannelOptions,
      hint: "Is-any-of. Leave empty for every channel.",
    },
    {
      key: "assigneeId",
      label: "Assignee ID",
      type: "string",
      hint: "A platform user id, or `none` for unassigned tickets.",
    },
    {
      key: "teamId",
      label: "Team ID",
      type: "string",
      hint: "Or `none` for tickets with no team.",
    },
    { key: "createdAfter", label: "Created after", type: "datetime" },
    { key: "createdBefore", label: "Created before", type: "datetime" },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      default: "updatedAt",
      options: [
        { value: "createdAt", label: "Created at" },
        { value: "updatedAt", label: "Updated at" },
        { value: "lastMessageAt", label: "Last message at" },
      ],
      hint: "A cursor is only valid for the sortBy/order it was issued with.",
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      default: "desc",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
    },
    {
      key: "includeTotal",
      label: "Include total count",
      type: "boolean",
      hint: "Costs an extra count query when enabled.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Tickets" },
    { key: "pagination", type: "object", label: "cursor, hasMore, total? (only if includeTotal)" },
  ],

  execute(input, ctx) {
    const query = compact({
      ...paginationQuery(input),
      status: toCommaList(input.status),
      channel: toCommaList(input.channel),
      assigneeId: input.assigneeId,
      teamId: input.teamId,
      createdAfter: input.createdAfter,
      createdBefore: input.createdBefore,
      sortBy: input.sortBy,
      order: input.order,
      includeTotal: input.includeTotal ? "true" : undefined,
    });
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/helpdesk/tickets`,
      { query },
    );
  },
};

export default ticketList;
