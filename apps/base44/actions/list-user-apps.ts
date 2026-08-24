import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  monitoringClient,
  requireDateOrUndefined,
  workspaceIdFromConnection,
} from "../lib/client.ts";
import { OPTIONAL_RANGE_PARAMS, PAGE_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v1/monitoring/{workspace_id}/users/{user_id}/apps` — the app ids
 * a member created. Simplified on purpose: it returns ids only, meant to be
 * fed into `get-app-analytics` one at a time rather than a full inventory —
 * `list-apps` is the workspace-wide inventory with metrics attached.
 */
const action: ActionDefinition = {
  key: "list-user-apps",
  type: "read",
  resource: "user",
  title: "List User's Apps",
  description: "App IDs created by one workspace member. Feed each into `get-app-analytics`.",
  params: [
    { key: "userId", label: "User ID", type: "string", required: true, hint: "From `list-users`." },
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
    { key: "active", label: "Viewed in the last 30 days", type: "boolean", advanced: true },
  ],
  output: [
    { key: "appIds", type: "array", label: "App IDs" },
    { key: "total", type: "number", label: "Total matching apps" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = String(p.userId ?? "").trim();
    if (!userId) throw new Error("userId is required");

    const workspaceId = workspaceIdFromConnection(ctx.connection);
    const client = monitoringClient(ctx);

    const body = await client.request<{
      app_ids: string[];
      pagination: { total: number; limit: number; next_cursor?: string | null; has_more: boolean };
    }>(`/${encodeURIComponent(workspaceId)}/users/${encodeURIComponent(userId)}/apps`, {
      query: compact({
        limit: p.limit,
        cursor: p.cursor,
        from: requireDateOrUndefined(p.from, "from"),
        to: requireDateOrUndefined(p.to, "to"),
        sort: p.sort,
        search: p.search,
        is_published: typeof p.isPublished === "boolean" ? p.isPublished : undefined,
        visibility: p.visibility,
        active: typeof p.active === "boolean" ? p.active : undefined,
      }),
    });

    return {
      appIds: body.app_ids,
      total: body.pagination.total,
      nextCursor: body.pagination.next_cursor ?? undefined,
      hasMore: body.pagination.has_more,
    };
  },
};

export default action;
