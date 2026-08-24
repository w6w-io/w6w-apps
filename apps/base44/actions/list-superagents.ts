import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  monitoringClient,
  requireDateOrUndefined,
  workspaceIdFromConnection,
} from "../lib/client.ts";
import { OPTIONAL_RANGE_PARAMS, PAGE_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v1/monitoring/{workspace_id}/superagents` — a paginated,
 * workspace-wide Superagent inventory with owner, activity, and credit-usage
 * metrics.
 */
const action: ActionDefinition = {
  key: "list-superagents",
  type: "read",
  resource: "superagent",
  title: "List Superagents",
  description: "Workspace-wide Superagent inventory with owner, activity, and credit usage.",
  params: [
    ...PAGE_PARAMS,
    ...OPTIONAL_RANGE_PARAMS,
    {
      key: "sort",
      label: "Sort",
      type: "select",
      options: [
        "superagent_name",
        "created_at",
        "created_by_email",
        "owner_user_id",
        "active_users_last_30d",
        "message_credits_consumed",
        "integration_credits_consumed",
        "total_credits_consumed",
      ].flatMap((f) => [{ value: f, label: f }, { value: `-${f}`, label: `${f} (desc)` }]),
      advanced: true,
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Superagent name or creator email.",
      advanced: true,
    },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      options: ["private", "workspace", "public_with_login", "public_without_login", "public"].map((
        v,
      ) => ({
        value: v,
        label: v,
      })),
      advanced: true,
    },
  ],
  output: [
    { key: "superagents", type: "array", label: "Superagents" },
    { key: "total", type: "number", label: "Total matching Superagents" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const workspaceId = workspaceIdFromConnection(ctx.connection);
    const client = monitoringClient(ctx);

    const body = await client.request<{
      superagents: unknown[];
      pagination: { total: number; limit: number; next_cursor?: string | null; has_more: boolean };
    }>(`/${encodeURIComponent(workspaceId)}/superagents`, {
      query: compact({
        limit: p.limit,
        cursor: p.cursor,
        from: requireDateOrUndefined(p.from, "from"),
        to: requireDateOrUndefined(p.to, "to"),
        sort: p.sort,
        search: p.search,
        visibility: p.visibility,
      }),
    });

    return {
      superagents: body.superagents,
      total: body.pagination.total,
      nextCursor: body.pagination.next_cursor ?? undefined,
      hasMore: body.pagination.has_more,
    };
  },
};

export default action;
