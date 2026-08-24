import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-superagent-analytics.ts";
import { mockConnectedCtx, mockCtx, pathOf, queryOf, WORKSPACE_ID } from "../_helpers.ts";

const ANALYTICS = {
  superagent_id: "agent1",
  superagent_name: "Support Agent",
  active_users_last_7d: 4,
  active_users_last_30d: 9,
  message_credits_consumed: 50,
  integration_credits_consumed: 5,
};

Deno.test("get-superagent-analytics: maps the analytics record", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: ANALYTICS }]);
  const result = await action.execute(
    { agentId: "agent1", from: "2026-06-01", to: "2026-06-30" },
    ctx,
  );

  assertEquals(
    pathOf(calls[0].url),
    `/api/v1/monitoring/${WORKSPACE_ID}/superagents/agent1/analytics`,
  );
  assertEquals(queryOf(calls[0].url), { from: "2026-06-01", to: "2026-06-30" });
  assertEquals(result, {
    superagentId: "agent1",
    superagentName: "Support Agent",
    activeUsersLast7d: 4,
    activeUsersLast30d: 9,
    messageCreditsConsumed: 50,
    integrationCreditsConsumed: 5,
  });
});

Deno.test("get-superagent-analytics: requires agentId, from, and to without making a request", async () => {
  const { ctx, calls } = mockConnectedCtx([]);
  await assertRejects(
    async () => await action.execute!({ from: "2026-06-01", to: "2026-06-30" }, ctx),
    Error,
    "agentId is required",
  );
  await assertRejects(
    async () => await action.execute!({ agentId: "agent1" }, ctx),
    Error,
    "from and to are both required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-superagent-analytics: fails without a connected workspace", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!({ agentId: "agent1", from: "2026-06-01", to: "2026-06-30" }, ctx),
    Error,
    "workspace id",
  );
});
