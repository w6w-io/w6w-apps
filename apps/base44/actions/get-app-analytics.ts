import type { ActionDefinition } from "@w6w/types";
import {
  monitoringClient,
  requireDateOrUndefined,
  workspaceIdFromConnection,
} from "../lib/client.ts";
import { REQUIRED_RANGE_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v1/monitoring/{workspace_id}/apps/{app_id}/analytics` — detailed
 * engagement, deployment, and governance metrics for one app. `from`/`to`
 * are required here (unlike the workspace-level endpoints, which default the
 * range). Get `appId` from `list-apps` or `list-user-apps`.
 *
 * The vendor's own note: `avgSessionDurationSec` always answers `0` — session
 * tracking for that field isn't implemented — surfaced verbatim rather than
 * silently dropped, so a workflow reading it does not mistake a documented
 * always-zero for a real measurement.
 */
const action: ActionDefinition = {
  key: "get-app-analytics",
  type: "read",
  resource: "app",
  title: "Get App Analytics",
  description:
    "Engagement, deployment, and governance metrics for one app. `avgSessionDurationSec` is " +
    "always 0 — the vendor documents session tracking as not yet implemented for that field.",
  params: [
    { key: "appId", label: "App ID", type: "string", required: true, hint: "From `list-apps`." },
    ...REQUIRED_RANGE_PARAMS,
  ],
  output: [
    { key: "appId", type: "string", label: "App ID" },
    { key: "appName", type: "string", label: "App name" },
    { key: "uniqueUsers", type: "number", label: "Unique users" },
    { key: "totalViews", type: "number", label: "Total views" },
    {
      key: "avgSessionDurationSec",
      type: "number",
      label: "Avg session duration (sec) — always 0",
    },
    { key: "viewsLast7d", type: "number", label: "Views in the last 7 days" },
    { key: "viewsLast30d", type: "number", label: "Views in the last 30 days" },
    { key: "activeUsersLast7d", type: "number", label: "Active users in the last 7 days" },
    { key: "activeUsersLast30d", type: "number", label: "Active users in the last 30 days" },
    { key: "messageCreditsConsumed", type: "number", label: "Message credits consumed" },
    { key: "integrationCreditsConsumed", type: "number", label: "Integration credits consumed" },
    { key: "dailyViews", type: "array", label: "Daily view counts" },
    { key: "lastPublished", type: "string", label: "Last published at" },
    { key: "visibility", type: "string", label: "Visibility" },
    { key: "hasAgent", type: "boolean", label: "Has an AI agent" },
    { key: "hasBackendFunction", type: "boolean", label: "Has backend functions" },
    { key: "hasAuthentication", type: "boolean", label: "Has authentication" },
    { key: "hasSso", type: "boolean", label: "Has SSO" },
    { key: "hasSecrets", type: "boolean", label: "Has secrets defined" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const appId = String(p.appId ?? "").trim();
    if (!appId) throw new Error("appId is required");
    const from = requireDateOrUndefined(p.from, "from");
    const to = requireDateOrUndefined(p.to, "to");
    if (!from || !to) throw new Error("from and to are both required");

    const workspaceId = workspaceIdFromConnection(ctx.connection);
    const client = monitoringClient(ctx);

    const a = await client.request<{
      app_id: string;
      app_name: string;
      unique_users: number;
      total_views: number;
      avg_session_duration_sec: number;
      views_last_7d: number;
      views_last_30d: number;
      active_users_last_7d: number;
      active_users_last_30d: number;
      message_credits_consumed: number;
      integration_credits_consumed: number;
      daily_views: unknown[];
      last_published?: string | null;
      visibility: string;
      has_agent: boolean;
      has_backend_function: boolean;
      has_authentication: boolean;
      has_sso: boolean;
      has_secrets: boolean;
    }>(`/${encodeURIComponent(workspaceId)}/apps/${encodeURIComponent(appId)}/analytics`, {
      query: { from, to },
    });

    return {
      appId: a.app_id,
      appName: a.app_name,
      uniqueUsers: a.unique_users,
      totalViews: a.total_views,
      avgSessionDurationSec: a.avg_session_duration_sec,
      viewsLast7d: a.views_last_7d,
      viewsLast30d: a.views_last_30d,
      activeUsersLast7d: a.active_users_last_7d,
      activeUsersLast30d: a.active_users_last_30d,
      messageCreditsConsumed: a.message_credits_consumed,
      integrationCreditsConsumed: a.integration_credits_consumed,
      dailyViews: a.daily_views,
      lastPublished: a.last_published ?? undefined,
      visibility: a.visibility,
      hasAgent: a.has_agent,
      hasBackendFunction: a.has_backend_function,
      hasAuthentication: a.has_authentication,
      hasSso: a.has_sso,
      hasSecrets: a.has_secrets,
    };
  },
};

export default action;
