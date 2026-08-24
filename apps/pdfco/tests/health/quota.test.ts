import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("quota: GETs the balance endpoint and reports remaining credits, no limit", async () => {
  const { ctx, calls } = mockCtx([{ body: { remainingCredits: 500 } }]);
  const report = await quota.check!({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/account/credit/balance");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].remaining, 500);
  assertEquals(report.quota?.[0].limit, undefined, "PDF.co publishes no ceiling via this API");
});

Deno.test("quota: zero credits is reported down, not just a warning", async () => {
  const { ctx } = mockCtx([{ body: { remainingCredits: 0 } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("quota: an unreadable body is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
