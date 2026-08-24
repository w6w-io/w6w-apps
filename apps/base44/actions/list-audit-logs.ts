import type { ActionDefinition } from "@w6w/types";
import { auditLogsClient, compact, workspaceIdFromConnection } from "../lib/client.ts";

/**
 * `POST /api/v1/audit-logs/{workspace_id}/list` — paginated audit log
 * events, filterable by event type, app, user email, status, and date range.
 * Verified against `PublicListAuditLogsRequest`/`PublicAuditLogsListResponse`
 * in the Audit Logs OpenAPI document and the full event-type catalogue at
 * `developers/references/audit-logs-api/get-started/event-types.md`.
 *
 * **This endpoint needs a workspace API key scoped to `audit_logs:read`.** A
 * personal API key, or a workspace key without that scope, answers `401`/
 * `403` — see `auth/api-key.ts` for why that doesn't mean the connection
 * itself is broken.
 */
const action: ActionDefinition = {
  key: "list-audit-logs",
  type: "read",
  resource: "audit-log",
  title: "List Audit Log Events",
  description:
    "Paginated workspace audit log events — auth, entity CRUD, app lifecycle, workspace admin, " +
    "and security-scan events. Requires a workspace key scoped to `audit_logs:read`.",
  params: [
    {
      key: "eventTypes",
      label: "Event types",
      type: "array",
      item: { type: "string", placeholder: "auth.login" },
      hint: "Exact event-type strings, e.g. `auth.login`, `app.entity.created`. See the app " +
        "README for the full catalogue. Leave empty for every type.",
    },
    { key: "userEmail", label: "User email", type: "string", advanced: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "success", label: "success" }, { value: "failure", label: "failure" }],
      advanced: true,
    },
    {
      key: "startDate",
      label: "Start date",
      type: "string",
      hint: "YYYY-MM-DDTHH:MM:SSZ, inclusive.",
      advanced: true,
    },
    {
      key: "endDate",
      label: "End date",
      type: "string",
      hint: "YYYY-MM-DDTHH:MM:SSZ, exclusive.",
      advanced: true,
    },
    { key: "appId", label: "App ID", type: "string", hint: "Narrow to one app.", advanced: true },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { min: 1, max: 1000, integer: true },
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "From a previous response's `pagination.next_cursor`.",
      advanced: true,
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [{ value: "DESC", label: "Newest first" }, { value: "ASC", label: "Oldest first" }],
      default: "DESC",
      advanced: true,
    },
  ],
  output: [
    { key: "events", type: "array", label: "Audit log events" },
    { key: "total", type: "number", label: "Total matching events" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const workspaceId = workspaceIdFromConnection(ctx.connection);
    const client = auditLogsClient(ctx);

    const eventTypes = Array.isArray(p.eventTypes)
      ? p.eventTypes.map((v) => String(v).trim()).filter(Boolean)
      : undefined;

    const body = await client.request<{
      events: unknown[];
      pagination: { total: number; next_cursor?: string | null };
    }>(`/${encodeURIComponent(workspaceId)}/list`, {
      method: "POST",
      body: compact({
        event_types: eventTypes && eventTypes.length > 0 ? eventTypes : undefined,
        user_email: p.userEmail,
        status: p.status,
        start_date: p.startDate,
        end_date: p.endDate,
        app_id: p.appId,
        limit: p.limit,
        cursor: p.cursor,
        order: p.order,
      }),
    });

    return {
      events: body.events,
      total: body.pagination.total,
      nextCursor: body.pagination.next_cursor ?? undefined,
    };
  },
};

export default action;
