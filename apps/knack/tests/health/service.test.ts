import { assert, assertEquals } from "@std/assert";
import service, { componentKey, mapComponentStatus, mapIndicator } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(overrides: Partial<{
  page: Record<string, unknown>;
  components: Array<Record<string, unknown>>;
  status: Record<string, unknown>;
  incidents: unknown[];
  scheduled_maintenances: unknown[];
}> = {}) {
  return {
    page: { id: "w2mf2swvx7sh", name: "Knack", url: "https://status.knack.com", ...overrides.page },
    components: overrides.components ?? [
      { id: "39z0356ftqyz", name: "API", status: "operational", group: false, group_id: "g1" },
      { id: "sd3vb582x7nq", name: "Builder", status: "operational", group: false, group_id: "g1" },
      { id: "ss3tnb4l784y", name: "Knack Features", status: "operational", group: true },
    ],
    status: overrides.status ?? { indicator: "none", description: "All Systems Operational" },
    incidents: overrides.incidents ?? [],
    scheduled_maintenances: overrides.scheduled_maintenances ?? [],
  };
}

Deno.test("service: reports ok from a healthy Statuspage summary, grouped rows excluded", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(Object.keys(result.components ?? {}).length, 2, "grouped row must be excluded");
  assertEquals(calls[0].url, "https://status.knack.com/api/v2/summary.json");
});

Deno.test("service: a degraded component reports degraded, keyed by vendor id", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      status: { indicator: "minor" },
      components: [
        { id: "39z0356ftqyz", name: "API", status: "degraded_performance", group: false },
      ],
    }),
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assertEquals(result.components?.["39z0356ftqyz"].state, "degraded");
});

Deno.test("service: a major outage reports down", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      status: { indicator: "critical" },
      components: [{ id: "39z0356ftqyz", name: "API", status: "major_outage", group: false }],
    }),
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
});

Deno.test("service: a broken status API is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as Knack's is unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ page: { url: "https://status.example.com" } }) }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("mapComponentStatus: covers Statuspage's documented vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("mapIndicator: covers the page-level roll-up vocabulary", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
});

Deno.test("componentKey: prefers the vendor id, falls back to a slug", () => {
  assertEquals(componentKey({ id: "abc123" }, 0), "abc123");
  assertEquals(componentKey({ name: "Live App" }, 2), "live-app-2");
  assertEquals(componentKey({}, 5), "component-5");
});

Deno.test("service: declares status.knack.com as its own egress, unsigned", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.knack.com"]);
  assert(service.scope === "app" || service.scope === undefined);
});
