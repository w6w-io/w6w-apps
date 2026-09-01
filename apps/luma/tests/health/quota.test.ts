import { assertEquals } from "@std/assert";
import quota, { parseResetHeader, WARN_FRACTION } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("parseResetHeader: converts a plausible Unix-seconds epoch to ISO", () => {
  // 2026-09-01T00:00:00.000Z
  assertEquals(parseResetHeader("1788220800"), "2026-09-01T00:00:00.000Z");
});

Deno.test("parseResetHeader: rejects anything not a plausible Unix-seconds epoch", () => {
  assertEquals(parseResetHeader(null), undefined);
  assertEquals(parseResetHeader("not-a-number"), undefined);
  assertEquals(parseResetHeader("12"), undefined); // too small — pre-2020
  assertEquals(parseResetHeader("1788307200123"), undefined); // 13 digits — likely milliseconds
  assertEquals(parseResetHeader("1788307200.5"), undefined); // not an integer
});

Deno.test("quota: ok when comfortably under the warn fraction", async () => {
  const { ctx } = mockCtx([
    {
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": "200",
        "x-ratelimit-remaining": "180",
      },
      body: { id: "usr-1" },
    },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{
    id: "requests-per-minute",
    limit: 200,
    remaining: 180,
    unit: "requests",
  }]);
});

Deno.test(`quota: degraded at or above ${WARN_FRACTION * 100}% used`, async () => {
  const { ctx } = mockCtx([
    {
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": "200",
        "x-ratelimit-remaining": "10",
      },
      body: {},
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: down when 0 remaining", async () => {
  const { ctx } = mockCtx([
    {
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": "200",
        "x-ratelimit-remaining": "0",
      },
      body: {},
    },
  ]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: a 429 reports down and surfaces Retry-After", async () => {
  const { ctx } = mockCtx([
    { status: 429, headers: { "content-type": "application/json", "retry-after": "42" }, body: {} },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "down");
  assertEquals(report.message?.includes("42s"), true);
});

Deno.test("quota: unknown when the response carries no rate-limit headers", async () => {
  const { ctx } = mockCtx([{ headers: { "content-type": "application/json" }, body: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: is a signed, connection-scoped check", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.kind, "quota");
});
