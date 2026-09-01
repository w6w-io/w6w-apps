import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota, { TEAM_URL } from "../../health/quota.ts";

Deno.test("quota: declares connection scope, signed credential, and reads GET /v0/teams/me", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.credential, "signed");
  assertEquals(TEAM_URL, "https://api.exa.ai/v0/teams/me");
});

Deno.test("quota: check reports ok with both dimensions' remaining headroom when well under limits", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        object: "team",
        id: "t_1",
        name: "Acme",
        concurrency: { active: 1, queued: 0 },
        limits: { maxConcurrent: 10, maxQueued: 50 },
      },
    },
  ]);

  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.length, 2);
  const concurrent = report.quota?.find((q) => q.id === "concurrent-requests");
  assertEquals(concurrent?.limit, 10);
  assertEquals(concurrent?.remaining, 9);
});

Deno.test("quota: check reports degraded once usage crosses the 90% warn threshold", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        concurrency: { active: 10, queued: 0 },
        limits: { maxConcurrent: 10, maxQueued: 50 },
      },
    },
  ]);

  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.message?.includes("concurrent-requests"), true);
});

Deno.test("quota: a null limit is reported as unmetered (no `limit`), not as 100% consumed", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        concurrency: { active: 3, queued: 0 },
        limits: { maxConcurrent: null, maxQueued: 50 },
      },
    },
  ]);

  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  const concurrent = report.quota?.find((q) => q.id === "concurrent-requests");
  assertEquals(concurrent?.limit, undefined);
});

Deno.test("quota: check reports unknown (not degraded/down) when Exa returns an error status", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: "forbidden", tag: "INSUFFICIENT_SCOPE" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
