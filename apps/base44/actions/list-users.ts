import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  monitoringClient,
  requireDateOrUndefined,
  workspaceIdFromConnection,
} from "../lib/client.ts";
import { OPTIONAL_RANGE_PARAMS, PAGE_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v1/monitoring/{workspace_id}/users` — every workspace member with
 * profile and credit-consumption data.
 *
 * `sort` and the boolean filters (`activeOnly`, `overMemberLimit`) are
 * documented enums/flags copied verbatim from the OpenAPI document — see
 * each param's hint for the exact accepted values.
 */
const action: ActionDefinition = {
  key: "list-users",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "Every workspace member, with profile data and credit consumption for a date range.",
  params: [
    ...PAGE_PARAMS,
    {
      key: "activeOnly",
      label: "Active only",
      type: "boolean",
      default: false,
      hint: "Only users who consumed message credits in the last 30 days.",
    },
    {
      key: "tier",
      label: "Tier",
      type: "string",
      hint: 'Filter by workspace tier, e.g. "builder", "pro", "enterprise".',
      advanced: true,
    },
    {
      key: "overMemberLimit",
      label: "Over member limit only",
      type: "boolean",
      default: false,
      hint: "Only members who exceeded their per-member credit limit this period.",
      advanced: true,
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      options: [
        "email",
        "created_at",
        "role",
        "total_apps",
        "total_superagents",
        "active_last_30d",
        "total_message_credits",
        "total_integration_credits",
        "total_credits",
        "credit_limit",
        "credit_limit_used",
        "credit_limit_remaining",
      ].flatMap((f) => [
        { value: f, label: f },
        { value: `-${f}`, label: `${f} (desc)` },
      ]),
      advanced: true,
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Case-insensitive email search.",
      advanced: true,
    },
    {
      key: "role",
      label: "Role",
      type: "select",
      options: ["owner", "admin", "editor", "viewer", "guest"].map((v) => ({ value: v, label: v })),
      advanced: true,
    },
    {
      key: "isActive",
      label: "Account enabled",
      type: "boolean",
      hint: "Filter by enabled/disabled platform account state. Leave unset for both.",
      advanced: true,
    },
    ...OPTIONAL_RANGE_PARAMS,
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "total", type: "number", label: "Total matching users" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const workspaceId = workspaceIdFromConnection(ctx.connection);
    const client = monitoringClient(ctx);

    const body = await client.request<{
      users: unknown[];
      pagination: { total: number; limit: number; next_cursor?: string | null; has_more: boolean };
    }>(`/${encodeURIComponent(workspaceId)}/users`, {
      query: compact({
        limit: p.limit,
        cursor: p.cursor,
        active_only: p.activeOnly === true ? true : undefined,
        tier: p.tier,
        over_member_limit: p.overMemberLimit === true ? true : undefined,
        sort: p.sort,
        search: p.search,
        role: p.role,
        is_active: typeof p.isActive === "boolean" ? p.isActive : undefined,
        from: requireDateOrUndefined(p.from, "from"),
        to: requireDateOrUndefined(p.to, "to"),
      }),
    });

    return {
      users: body.users,
      total: body.pagination.total,
      nextCursor: body.pagination.next_cursor ?? undefined,
      hasMore: body.pagination.has_more,
    };
  },
};

export default action;
