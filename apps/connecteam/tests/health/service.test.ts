import { assert, assertEquals } from "@std/assert";
import service, { componentKey, mapComponentStatus, mapIndicator } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "rm6hp617s26d", name: "Connecteam", url: "https://connecteam.statuspage.io" },
    components: [
      { id: "6sh1hb53dj67", name: "Platform", status: "operational", group: false },
      { id: "n7t6gjjzznxp", name: "Time Clock", status: "operational", group: false },
    ],
    incidents: [],
    scheduled_maintenances: [],
    status: { indicator: "none", description: "All Systems Operational" },
    ...overrides,
  };
}

Deno.test("mapComponentStatus: maps the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(mapComponentStatus("something-new"), "unknown");
});

Deno.test("mapIndicator: maps the page-level roll-up", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("componentKey: prefers the vendor id, falls back to a name slug", () => {
  assertEquals(componentKey({ id: "abc123", name: "Time Clock" }, 0), "abc123");
  assertEquals(componentKey({ name: "Job Scheduler" }, 3), "job-scheduler-3");
  assertEquals(componentKey({}, 5), "component-5");
});

Deno.test("service.check: all-operational summary reports ok with per-component detail", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["6sh1hb53dj67"], { state: "ok", message: "Platform" });
  assertEquals(report.components?.["n7t6gjjzznxp"], { state: "ok", message: "Time Clock" });
});

Deno.test("service.check: a degraded component surfaces in the message and the verdict", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({
        components: [
          { id: "n7t6gjjzznxp", name: "Time Clock", status: "partial_outage", group: false },
        ],
        status: { indicator: "minor" },
      }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("Time Clock"), report.message);
});

Deno.test("service.check: a broken status API reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service.check: a page that no longer self-identifies as Connecteam's is unknown", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({
        page: { id: "x", name: "Someone Else", url: "https://someone-else.statuspage.io" },
      }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service.check: group rows are excluded from the component report", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({
        components: [
          { id: "g1", name: "A Group", status: "operational", group: true },
          { id: "c1", name: "Platform", status: "operational", group: false },
        ],
      }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["c1"]);
});

Deno.test("service: unsigned, app-scoped, widens egress only to its own status host", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
  assertEquals(service.network?.allow, ["connecteam.statuspage.io"]);
});
