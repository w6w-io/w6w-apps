import type { ActionDefinition } from "@w6w/types";
import {
  monitoringClient,
  requireDateOrUndefined,
  workspaceIdFromConnection,
} from "../lib/client.ts";
import { OPTIONAL_RANGE_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v1/monitoring/analytics/{workspace_id}` — workspace-level
 * summary KPIs, user/app distribution, the shared credit pool, per-member
 * credit-limit aggregates, and credits consumed. Real-time from the database
 * per the vendor's own description.
 *
 * `from`/`to` accept `YYYY-MM-DD` and both default when omitted (billing
 * period start / today); the API rejects a range over one year.
 */
const action: ActionDefinition = {
  key: "get-analytics",
  type: "read",
  resource: "analytics",
  title: "Get Workspace Analytics",
  description:
    "Workspace-level KPIs, user/app distribution, the shared credit pool, member credit-limit " +
    "aggregates, and credits consumed.",
  params: [...OPTIONAL_RANGE_PARAMS],
  output: [
    { key: "summary", type: "object", label: "Summary" },
    { key: "userDistribution", type: "object", label: "User distribution" },
    { key: "appDistribution", type: "object", label: "App distribution" },
    { key: "creditPool", type: "object", label: "Credit pool" },
    { key: "memberAllocations", type: "object", label: "Member allocations summary" },
    { key: "credits", type: "object", label: "Credits summary" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const workspaceId = workspaceIdFromConnection(ctx.connection);
    const client = monitoringClient(ctx);

    const body = await client.request<{
      summary: unknown;
      user_distribution: unknown;
      app_distribution: unknown;
      credit_pool: unknown;
      member_allocations: unknown;
      credits: unknown;
    }>(`/analytics/${encodeURIComponent(workspaceId)}`, {
      query: {
        from: requireDateOrUndefined(p.from, "from"),
        to: requireDateOrUndefined(p.to, "to"),
      },
    });

    return {
      summary: body.summary,
      userDistribution: body.user_distribution,
      appDistribution: body.app_distribution,
      creditPool: body.credit_pool,
      memberAllocations: body.member_allocations,
      credits: body.credits,
    };
  },
};

export default action;
