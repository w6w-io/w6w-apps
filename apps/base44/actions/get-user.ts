import type { ActionDefinition } from "@w6w/types";
import {
  monitoringClient,
  requireDateOrUndefined,
  workspaceIdFromConnection,
} from "../lib/client.ts";
import { OPTIONAL_RANGE_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v1/monitoring/{workspace_id}/users/{user_id}` — one member's
 * profile and credit consumption for a date range. Get `userId` from
 * `list-users`.
 */
const action: ActionDefinition = {
  key: "get-user",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "One workspace member's profile and credit consumption for a date range.",
  params: [
    { key: "userId", label: "User ID", type: "string", required: true, hint: "From `list-users`." },
    ...OPTIONAL_RANGE_PARAMS,
  ],
  output: [
    { key: "userId", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "createdAt", type: "string", label: "Registered at" },
    { key: "isActive", type: "boolean", label: "Account enabled" },
    { key: "role", type: "string", label: "Workspace role" },
    { key: "totalApps", type: "number", label: "Apps owned" },
    { key: "totalSuperagents", type: "number", label: "Superagents owned" },
    { key: "activeLast30d", type: "boolean", label: "Active in the last 30 days" },
    { key: "totalMessageCredits", type: "number", label: "Message credits consumed" },
    { key: "totalIntegrationCredits", type: "number", label: "Integration credits consumed" },
    { key: "totalCredits", type: "number", label: "Total credits consumed" },
    { key: "memberAllocation", type: "object", label: "Per-member credit limit status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = String(p.userId ?? "").trim();
    if (!userId) throw new Error("userId is required");

    const workspaceId = workspaceIdFromConnection(ctx.connection);
    const client = monitoringClient(ctx);

    const u = await client.request<{
      user_id: string;
      email: string;
      created_at: string;
      is_active: boolean;
      role: string;
      total_apps: number;
      total_superagents: number;
      active_last_30d: boolean;
      total_message_credits: number;
      total_integration_credits: number;
      total_credits: number;
      member_allocation?: unknown;
    }>(`/${encodeURIComponent(workspaceId)}/users/${encodeURIComponent(userId)}`, {
      query: {
        from: requireDateOrUndefined(p.from, "from"),
        to: requireDateOrUndefined(p.to, "to"),
      },
    });

    return {
      userId: u.user_id,
      email: u.email,
      createdAt: u.created_at,
      isActive: u.is_active,
      role: u.role,
      totalApps: u.total_apps,
      totalSuperagents: u.total_superagents,
      activeLast30d: u.active_last_30d,
      totalMessageCredits: u.total_message_credits,
      totalIntegrationCredits: u.total_integration_credits,
      totalCredits: u.total_credits,
      memberAllocation: u.member_allocation ?? null,
    };
  },
};

export default action;
