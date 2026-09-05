import { assertEquals } from "@std/assert";
import quota, { WARN_FRACTION } from "../../health/quota.ts";
import { PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

function rlHeaders(limit: number, remaining: number, resetInSeconds = 2) {
  return {
    "content-type": "application/json",
    "x-ratelimit-limit": String(limit),
    "x-ratelimit-remaining": String(remaining),
    "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + resetInSeconds),
  };
}

Deno.test("quota: reads GET /v0/roles — the same call the auth probe makes", async () => {
  const { ctx, calls } = mockCtx([{ headers: rlHeaders(20, 19), body: [] }]);
  await quota.check!({}, ctx);
  assertEquals(pathOf(calls[0].url), `/v0${PROBE_PATH}`);
});

Deno.test("quota: plenty of headroom reports ok with a quota reading", async () => {
  const { ctx } = mockCtx([{ headers: rlHeaders(20, 19), body: [] }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota?.[0].limit, 20);
  assertEquals(out.quota?.[0].remaining, 19);
});

Deno.test(`quota: at or above ${WARN_FRACTION * 100}% consumed reports degraded`, async () => {
  const { ctx } = mockCtx([{ headers: rlHeaders(20, 1), body: [] }]); // 19/20 = 95% used
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "degraded");
});

Deno.test("quota: fully exhausted reports degraded, not down", async () => {
  const { ctx } = mockCtx([{ headers: rlHeaders(20, 0), body: [] }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "degraded");
});

Deno.test("quota: a 401 (bad credential) reports unknown, not degraded", async () => {
  const { ctx } = mockCtx([
    { status: 401, headers: rlHeaders(20, 19), body: { error: true, message: "Invalid API Key" } },
  ]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("quota: missing rate-limit headers reports unknown", async () => {
  const { ctx } = mockCtx([{ body: [] }]); // default content-type header only
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("quota: is a signed, connection-scoped check", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.credential, "signed");
});
