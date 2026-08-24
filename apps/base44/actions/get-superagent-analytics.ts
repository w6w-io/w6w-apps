import type { ActionDefinition } from "@w6w/types";
import {
  monitoringClient,
  requireDateOrUndefined,
  workspaceIdFromConnection,
} from "../lib/client.ts";
import { REQUIRED_RANGE_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v1/monitoring/{workspace_id}/superagents/{agent_id}/analytics` —
 * active-user and credit-usage metrics for one Superagent. `from`/`to` are
 * required. Get `agentId` from `list-superagents` or `list-user-superagents`.
 */
const action: ActionDefinition = {
  key: "get-superagent-analytics",
  type: "read",
  resource: "superagent",
  title: "Get Superagent Analytics",
  description:
    "Active-user and credit-usage metrics for one Superagent, over a required date range.",
  params: [
    {
      key: "agentId",
      label: "Superagent ID",
      type: "string",
      required: true,
      hint: "From `list-superagents`.",
    },
    ...REQUIRED_RANGE_PARAMS,
  ],
  output: [
    { key: "superagentId", type: "string", label: "Superagent ID" },
    { key: "superagentName", type: "string", label: "Superagent name" },
    { key: "activeUsersLast7d", type: "number", label: "Active users in the last 7 days" },
    { key: "activeUsersLast30d", type: "number", label: "Active users in the last 30 days" },
    { key: "messageCreditsConsumed", type: "number", label: "Message credits consumed" },
    { key: "integrationCreditsConsumed", type: "number", label: "Integration credits consumed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const agentId = String(p.agentId ?? "").trim();
    if (!agentId) throw new Error("agentId is required");
    const from = requireDateOrUndefined(p.from, "from");
    const to = requireDateOrUndefined(p.to, "to");
    if (!from || !to) throw new Error("from and to are both required");

    const workspaceId = workspaceIdFromConnection(ctx.connection);
    const client = monitoringClient(ctx);

    const a = await client.request<{
      superagent_id: string;
      superagent_name: string;
      active_users_last_7d: number;
      active_users_last_30d: number;
      message_credits_consumed: number;
      integration_credits_consumed: number;
    }>(`/${encodeURIComponent(workspaceId)}/superagents/${encodeURIComponent(agentId)}/analytics`, {
      query: { from, to },
    });

    return {
      superagentId: a.superagent_id,
      superagentName: a.superagent_name,
      activeUsersLast7d: a.active_users_last_7d,
      activeUsersLast30d: a.active_users_last_30d,
      messageCreditsConsumed: a.message_credits_consumed,
      integrationCreditsConsumed: a.integration_credits_consumed,
    };
  },
};

export default action;
