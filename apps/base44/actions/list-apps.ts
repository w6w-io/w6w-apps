import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  monitoringClient,
  requireDateOrUndefined,
  workspaceIdFromConnection,
} from "../lib/client.ts";
import { OPTIONAL_RANGE_PARAMS, PAGE_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v1/monitoring/{workspace_id}/apps` — a paginated, workspace-wide
 * app inventory with owner, visibility, publish, activity, and credit-usage
 * metrics — the endpoint the docs say exists specifically to avoid
 * client-side fan-out through every workspace user's `list-user-apps` call.
 */
const action: ActionDefinition = {
  key: "list-apps",
  type: "read",
  resource: "app",
  title: "List Apps",
  description:
    "Workspace-wide app inventory with owner, visibility, publish state, and credit usage.",
  params: [
    ...PAGE_PARAMS,
    ...OPTIONAL_RANGE_PARAMS,
    {
      key: "sort",
      label: "Sort",
      type: "select",
      options: [
        "app_name",
        "created_at",
        "created_by_email",
        "owner_user_id",
        "last_published",
        "is_published",
        "views_last_30d",
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
      hint: "App name or creator email.",
      advanced: true,
    },
    { key: "isPublished", label: "Published only", type: "boolean", advanced: true },
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
    { key: "apps", type: "array", label: "Apps" },
    { key: "total", type: "number", label: "Total matching apps" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const workspaceId = workspaceIdFromConnection(ctx.connection);
    const client = monitoringClient(ctx);

    const body = await client.request<{
      apps: unknown[];
      pagination: { total: number; limit: number; next_cursor?: string | null; has_more: boolean };
    }>(`/${encodeURIComponent(workspaceId)}/apps`, {
      query: compact({
        limit: p.limit,
        cursor: p.cursor,
        from: requireDateOrUndefined(p.from, "from"),
        to: requireDateOrUndefined(p.to, "to"),
        sort: p.sort,
        search: p.search,
        is_published: typeof p.isPublished === "boolean" ? p.isPublished : undefined,
        visibility: p.visibility,
      }),
    });

    return {
      apps: body.apps,
      total: body.pagination.total,
      nextCursor: body.pagination.next_cursor ?? undefined,
      hasMore: body.pagination.has_more,
    };
  },
};

export default action;
