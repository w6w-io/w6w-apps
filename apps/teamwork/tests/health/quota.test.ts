import { assertEquals } from "@std/assert";
import { mockCtx, mockTeamworkCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: unknown when the connection carries no site name", async () => {
  const { ctx } = mockCtx();
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("quota: ok with plenty of headroom", async () => {
  const { ctx } = mockTeamworkCtx([{
    body: { people: [] },
    headers: { "x-rate-limit-limit": "150", "x-rate-limit-remaining": "140" },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota?.[0], { id: "account", limit: 150, remaining: 140, unit: "requests" });
});

Deno.test("quota: degraded under 10% remaining", async () => {
  const { ctx } = mockTeamworkCtx([{
    body: { people: [] },
    headers: { "x-rate-limit-limit": "150", "x-rate-limit-remaining": "5" },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "degraded");
});

Deno.test("quota: down at zero remaining", async () => {
  const { ctx } = mockTeamworkCtx([{
    body: { people: [] },
    headers: { "x-rate-limit-limit": "150", "x-rate-limit-remaining": "0" },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("quota: unknown when the probe fails", async () => {
  const { ctx } = mockTeamworkCtx([{ status: 500 }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("quota: unknown when no rate-limit headers are present (e.g. an unauthenticated 401)", async () => {
  const { ctx } = mockTeamworkCtx([{ body: {} }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
});
