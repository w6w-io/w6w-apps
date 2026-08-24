import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-analytics.ts";
import { mockConnectedCtx, mockCtx, pathOf, queryOf, WORKSPACE_ID } from "../_helpers.ts";

const RESPONSE = {
  summary: { total_applications: 1 },
  user_distribution: { total_users: 1 },
  app_distribution: { total_users: 1, median_apps_per_user: 1, apps_per_user_ranges: [] },
  credit_pool: { tier: "enterprise" },
  member_allocations: { capability_enabled: false },
  credits: { message_credits: 0, integration_credits: 0, total_credits: 0 },
};

Deno.test("get-analytics: maps the workspace analytics envelope", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: RESPONSE }]);
  const result = await action.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), `/api/v1/monitoring/analytics/${WORKSPACE_ID}`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(result, {
    summary: RESPONSE.summary,
    userDistribution: RESPONSE.user_distribution,
    appDistribution: RESPONSE.app_distribution,
    creditPool: RESPONSE.credit_pool,
    memberAllocations: RESPONSE.member_allocations,
    credits: RESPONSE.credits,
  });
});

Deno.test("get-analytics: passes a well-formed date range through", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: RESPONSE }]);
  await action.execute({ from: "2026-01-01", to: "2026-02-01" }, ctx);

  assertEquals(queryOf(calls[0].url), { from: "2026-01-01", to: "2026-02-01" });
});

Deno.test("get-analytics: rejects a malformed date without making a request", async () => {
  const { ctx, calls } = mockConnectedCtx([]);
  await assertRejects(
    async () => await action.execute!({ from: "01/01/2026" }, ctx),
    Error,
    "from must be in",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-analytics: fails without a connected workspace", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "workspace id");
});

Deno.test("get-analytics: surfaces the vendor's 422 validation detail", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 422,
    body: { detail: [{ loc: ["query", "to"], msg: "field required", type: "missing" }] },
  }]);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "query.to: field required",
  );
});
