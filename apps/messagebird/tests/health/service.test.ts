import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Shaped from the live response measured 2026-09-01 (26,430 bytes, ~90 components). */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "xf8120tyqx8n", name: "Bird", url: "https://status.bird.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "jqyv6txds1xs", name: "SMS - API", status: "operational", group: false },
      { id: "zv1d1qfn9rp1", name: "Voice - API", status: "operational", group: false },
      { id: "brfvcr4b40v7", name: "SMS - API V1", status: "operational", group: false },
      { id: "ddyzx1y5t9s8", name: "Messaging - API", status: "operational", group: false },
      { id: "wnkkscvw903d", name: "Connectivity Platform", status: "operational", group: true },
    ],
    ...overrides,
  };
}

Deno.test("service: probes status.bird.com, unsigned, with widened egress", () => {
  assertEquals(service.network?.allow, ["status.bird.com"]);
  assertEquals(service.credential ?? "none", "none");
  assertEquals(service.kind, "service");
});

Deno.test("service: an all-operational page reports ok for both watched components", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, "https://status.bird.com/api/v2/summary.json");
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["sms-api"].state, "ok");
  assertEquals(report.components?.["voice-api"].state, "ok");
});

/**
 * "SMS - API V1" (api.messagebird.com) and "Messaging - API" (Bird's newer
 * unified product) are NOT this app's surface and must never leak into the
 * report — including staying green when they are down.
 */
Deno.test("service: unrelated components are excluded even when they are down", async () => {
  const body = summary();
  (body.components as Array<{ status: string }>)[2].status = "major_outage"; // SMS - API V1
  (body.components as Array<{ status: string }>)[3].status = "major_outage"; // Messaging - API
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).sort(), ["sms-api", "voice-api"]);
});

Deno.test("service: a degraded SMS - API component reports degraded", async () => {
  const body = summary();
  (body.components as Array<{ status: string }>)[0].status = "partial_outage";
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assertEquals(report.components?.["sms-api"].state, "degraded");
});

Deno.test("service: a major outage on Voice - API reports down", async () => {
  const body = summary();
  (body.components as Array<{ status: string }>)[1].status = "major_outage";
  const { ctx } = mockCtx([{ body }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

/** A broken status page says nothing about MessageBird — never `down`. */
Deno.test("service: a failing status page reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/** If the page reshuffles component names, fall back to the page indicator rather than silence. */
Deno.test("service: falls back to the page indicator when the watched components are gone", async () => {
  const body = summary({
    components: [{ id: "x", name: "Something Else", status: "operational" }],
  });
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok");
  assert(/not found/.test(report.message ?? ""), report.message);
  assertEquals(report.components, undefined);
});
