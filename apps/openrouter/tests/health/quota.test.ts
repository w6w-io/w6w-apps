import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: probes GET /key, signed, informational", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: an unlimited key (limit null) reports ok", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: { label: "sk-or-v1-a...b", limit: null, limit_remaining: null } } },
  ]);
  const report = await quota.check!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/key");
  assertEquals(report.state, "ok");
});

Deno.test("quota: plenty of headroom reports ok with the reading attached", async () => {
  const { ctx } = mockCtx([
    { body: { data: { limit: 100, limit_remaining: 74.5 } } },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(report.quota, [{ id: "credits", limit: 100, remaining: 74.5, unit: "USD" }]);
});

Deno.test("quota: below the warn fraction reports degraded", async () => {
  const { ctx } = mockCtx([
    { body: { data: { limit: 100, limit_remaining: 5 } } },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assert(/low/.test(report.message ?? ""), report.message);
});

Deno.test("quota: exhausted headroom reports down", async () => {
  const { ctx } = mockCtx([
    { body: { data: { limit: 100, limit_remaining: 0 } } },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "down");
  assert(/exhausted/.test(report.message ?? ""), report.message);
});

/** A failing probe says nothing about headroom — never `down`. */
Deno.test("quota: a failing probe reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: a response with no data reports unknown", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
