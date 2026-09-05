import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("quota: ok with plenty of headroom", async () => {
  const { ctx, calls } = mockCtx([{
    body: [],
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "60",
      "x-ratelimit-remaining": "59",
      "x-ratelimit-reset": "1788624960",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/campaigns");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].limit, 60);
  assertEquals(report.quota?.[0].remaining, 59);
  assertEquals(report.quota?.[0].resetAt, new Date(1788624960 * 1000).toISOString());
});

Deno.test("quota: degraded under 10% headroom", async () => {
  const { ctx } = mockCtx([{
    body: [],
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "60",
      "x-ratelimit-remaining": "3",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: down when remaining hits zero", async () => {
  const { ctx } = mockCtx([{
    body: [],
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "60",
      "x-ratelimit-remaining": "0",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: unknown when no rate-limit header is present", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Authentication failed" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: is connection-scoped, signed, and informational so it never worsens a roll-up", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.severity, "informational");
});
