import { assertEquals } from "@std/assert";
import service, { componentKey, mapComponentStatus, mapIndicator } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "ljq5y0ynq18f", name: "WhatConverts", url: "https://status.whatconverts.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "77wpzvlf1dqx", name: "Dashboard", status: "operational", group: false },
      { id: "zvdklsm5rlcg", name: "API", status: "operational", group: false },
    ],
    incidents: [],
    scheduled_maintenances: [],
    ...overrides,
  };
}

Deno.test("mapComponentStatus maps the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(mapComponentStatus("something_new"), "unknown");
});

Deno.test("mapIndicator maps the page-level roll-up", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("componentKey prefers the vendor id, falls back to a name slug", () => {
  assertEquals(componentKey({ id: "abc123", name: "API" }, 0), "abc123");
  assertEquals(componentKey({ name: "Lead Processing" }, 3), "lead-processing-3");
  assertEquals(componentKey({}, 5), "component-5");
});

Deno.test("check() reports ok with per-component detail when all operational", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["zvdklsm5rlcg"], { state: "ok", message: "API" });
  assertEquals(report.ttlSeconds, 60);
});

Deno.test("check() reports degraded and names the affected component", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary({
      status: { indicator: "minor", description: "Partial outage" },
      components: [
        { id: "77wpzvlf1dqx", name: "Dashboard", status: "operational", group: false },
        { id: "zvdklsm5rlcg", name: "API", status: "degraded_performance", group: false },
      ],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.components?.["zvdklsm5rlcg"].state, "degraded");
  assertEquals(report.message?.includes("API (degraded_performance)"), true);
});

Deno.test("check() reports down on a major outage indicator", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary({ status: { indicator: "critical", description: "Major outage" } }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("check() returns unknown, never down, when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "server error" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("check() returns unknown on an unreadable body", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "not json",
    headers: { "content-type": "text/plain" },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("check() returns unknown when the page no longer self-identifies as WhatConverts", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary({ page: { id: "x", name: "Someone Else", url: "https://status.example.com" } }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertEquals(report.message?.includes("no longer self-identifies"), true);
});

Deno.test("check() returns unknown when there are no components", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summary({ components: [] }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service declares network.allow scoped to the status host only", () => {
  assertEquals(service.network?.allow, ["status.whatconverts.com"]);
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
});
