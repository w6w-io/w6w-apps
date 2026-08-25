import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockDeskCtx } from "../_helpers.ts";

Deno.test("quota: has a real check hook, unlike zohobooks' declared absence", () => {
  assertEquals(typeof quota.check, "function");
  assertEquals(quota.unavailable, undefined);
});

Deno.test("quota: informational, so a probe failure cannot pin the App at unknown forever", () => {
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: reads X-Rate-Limit-Remaining-v3 off GET /organizations", async () => {
  const { ctx, calls } = mockDeskCtx([
    { body: { data: [] }, headers: { "x-rate-limit-remaining-v3": "950" } },
  ]);
  const result = await quota.check!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/organizations");
  assertEquals((result as { state: string }).state, "ok");
  assertEquals(
    (result as { quota?: Array<{ remaining?: number }> }).quota?.[0].remaining,
    950,
  );
});

Deno.test("quota: down once the daily budget is fully exhausted", async () => {
  const { ctx } = mockDeskCtx([
    { body: { data: [] }, headers: { "x-rate-limit-remaining-v3": "0" } },
  ]);
  const result = await quota.check!({}, ctx);
  assertEquals((result as { state: string }).state, "down");
});

Deno.test("quota: degraded under the conservative low-headroom floor", async () => {
  const { ctx } = mockDeskCtx([
    { body: { data: [] }, headers: { "x-rate-limit-remaining-v3": "10" } },
  ]);
  const result = await quota.check!({}, ctx);
  assertEquals((result as { state: string }).state, "degraded");
});

Deno.test("quota: unknown when the header is absent", async () => {
  const { ctx } = mockDeskCtx([{ body: { data: [] } }]);
  const result = await quota.check!({}, ctx);
  assertEquals((result as { state: string }).state, "unknown");
});

Deno.test("quota: unknown when the probe itself fails", async () => {
  const { ctx } = mockDeskCtx([{ status: 500, body: "boom" }]);
  const result = await quota.check!({}, ctx);
  assertEquals((result as { state: string }).state, "unknown");
});

Deno.test("quota: declares no network widening (stays on the app's own allowlist)", () => {
  assertEquals(quota.network, undefined);
  assertEquals(quota.kind, "quota");
});
