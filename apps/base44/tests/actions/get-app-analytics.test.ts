import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-app-analytics.ts";
import { mockConnectedCtx, mockCtx, pathOf, queryOf, WORKSPACE_ID } from "../_helpers.ts";

const ANALYTICS = {
  app_id: "app1",
  app_name: "Sales Dashboard",
  unique_users: 5,
  total_views: 10,
  avg_session_duration_sec: 0,
  views_last_7d: 2,
  views_last_30d: 10,
  active_users_last_7d: 1,
  active_users_last_30d: 5,
  message_credits_consumed: 100,
  integration_credits_consumed: 20,
  daily_views: [{ date: "2026-06-29", views: 45 }],
  last_published: "2025-01-10T14:30:00Z",
  visibility: "Public",
  has_agent: true,
  has_backend_function: false,
  has_authentication: true,
  has_sso: false,
  has_secrets: true,
};

Deno.test("get-app-analytics: maps the analytics record", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: ANALYTICS }]);
  const result = await action.execute!(
    { appId: "app1", from: "2026-06-01", to: "2026-06-30" },
    ctx,
  ) as {
    appId: string;
    avgSessionDurationSec: number;
    hasAgent: boolean;
  };

  assertEquals(pathOf(calls[0].url), `/api/v1/monitoring/${WORKSPACE_ID}/apps/app1/analytics`);
  assertEquals(queryOf(calls[0].url), { from: "2026-06-01", to: "2026-06-30" });
  assertEquals(result.appId, "app1");
  assertEquals(result.avgSessionDurationSec, 0);
  assertEquals(result.hasAgent, true);
});

Deno.test("get-app-analytics: requires appId, from, and to without making a request", async () => {
  const { ctx, calls } = mockConnectedCtx([]);
  await assertRejects(
    async () => await action.execute!({ from: "2026-06-01", to: "2026-06-30" }, ctx),
    Error,
    "appId is required",
  );
  await assertRejects(
    async () => await action.execute!({ appId: "app1" }, ctx),
    Error,
    "from and to are both required",
  );
  await assertRejects(
    async () => await action.execute!({ appId: "app1", from: "2026-06-01" }, ctx),
    Error,
    "from and to are both required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-app-analytics: rejects a malformed date", async () => {
  const { ctx, calls } = mockConnectedCtx([]);
  await assertRejects(
    async () => await action.execute!({ appId: "app1", from: "not-a-date", to: "2026-06-30" }, ctx),
    Error,
    "from must be in",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-app-analytics: fails without a connected workspace", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ appId: "app1", from: "2026-06-01", to: "2026-06-30" }, ctx),
    Error,
    "workspace id",
  );
});
