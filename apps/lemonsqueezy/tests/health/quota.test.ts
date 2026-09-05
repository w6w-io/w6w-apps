import { assert, assertEquals } from "@std/assert";
import quota, { QUOTA_URL } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: declares a signed, connection-scoped check", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
});

Deno.test("check: plenty of headroom reports ok with the reading", async () => {
  const { ctx, calls } = mockCtx([
    { headers: { "x-ratelimit-limit": "300", "x-ratelimit-remaining": "250" } },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{ limit: 300, remaining: 250, unit: "requests/minute" }]);
  assertEquals(calls[0].url, QUOTA_URL);
});

Deno.test("check: near-exhausted headroom reports degraded", async () => {
  const { ctx } = mockCtx([
    { headers: { "x-ratelimit-limit": "300", "x-ratelimit-remaining": "10" } },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("check: zero remaining reports down", async () => {
  const { ctx } = mockCtx([
    { headers: { "x-ratelimit-limit": "300", "x-ratelimit-remaining": "0" } },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("check: missing rate-limit headers reports unknown, not a guess", async () => {
  const { ctx } = mockCtx([{ headers: { "content-type": "application/vnd.api+json" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

/** A bad credential is the auth check's job to report, not quota's. */
Deno.test("check: a non-2xx reports unknown rather than down", async () => {
  const { ctx } = mockCtx([{ status: 401 }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("401"));
});
