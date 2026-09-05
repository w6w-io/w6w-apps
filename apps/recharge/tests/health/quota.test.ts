import { assert, assertEquals } from "@std/assert";
import quota, { parseLimitHeader } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("parseLimitHeader: parses the measured <used>/<cap> shape", () => {
  assertEquals(parseLimitHeader("1/40"), { used: 1, cap: 40 });
  assertEquals(parseLimitHeader("40/40"), { used: 40, cap: 40 });
});

Deno.test("parseLimitHeader: returns undefined for a missing or malformed header", () => {
  assertEquals(parseLimitHeader(null), undefined);
  assertEquals(parseLimitHeader(""), undefined);
  assertEquals(parseLimitHeader("not-a-ratio"), undefined);
  assertEquals(parseLimitHeader("1/0"), undefined);
});

Deno.test("quota: reports ok with remaining headroom well under the cap", async () => {
  const { ctx } = mockCtx([
    { body: { token_information: {} }, headers: { "x-recharge-limit": "1/40" } },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].limit, 40);
  assertEquals(report.quota?.[0].remaining, 39);
});

Deno.test("quota: reports degraded once at or above the 90% warn fraction", async () => {
  const { ctx } = mockCtx([
    { body: { token_information: {} }, headers: { "x-recharge-limit": "37/40" } },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("near the rate limit"));
});

Deno.test("quota: reports degraded, not down, when fully at the limit", async () => {
  const { ctx } = mockCtx([
    { body: { token_information: {} }, headers: { "x-recharge-limit": "40/40" } },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("at the rate limit"));
});

Deno.test("quota: unknown, not a failure, when the header is absent", async () => {
  const { ctx } = mockCtx([{ body: { token_information: {} }, headers: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: reads the header even off a rejected (401) response", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: { error: "bad authentication" },
      headers: { "content-type": "application/json", "x-recharge-limit": "2/40" },
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].remaining, 38);
});

Deno.test("quota: declares itself signed and connection-scoped", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
});
