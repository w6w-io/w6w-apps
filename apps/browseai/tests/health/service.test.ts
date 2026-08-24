import { assertEquals } from "@std/assert";
import service, { componentKey, mapComponentStatus, mapIndicator } from "../../health/service.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const SUMMARY = {
  page: {
    id: "z0nb4vpg4t7t",
    name: "Browse AI System Status",
    url: "https://browseai.statuspage.io",
  },
  components: [
    { id: "0rxcrg5v380t", name: "Public API", status: "operational", group: false },
    { id: "1nlz652427mc", name: "Robots' Task Execution", status: "operational", group: false },
  ],
  incidents: [],
  scheduled_maintenances: [],
  status: { indicator: "none", description: "All Systems Operational" },
};

Deno.test("service: reports ok when the page indicator is none", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: SUMMARY }]);
  const out = await service.check!({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/summary.json");
  assertEquals(out.state, "ok");
  assertEquals(out.components?.["0rxcrg5v380t"].state, "ok");
});

Deno.test("service: a major_outage component reports down via the page indicator", async () => {
  const body = {
    ...SUMMARY,
    components: [{ id: "0rxcrg5v380t", name: "Public API", status: "major_outage", group: false }],
    status: { indicator: "critical", description: "Public API is down" },
  };
  const { ctx } = mockCtx([{ status: 200, body }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
  assertEquals(out.components?.["0rxcrg5v380t"].state, "down");
});

Deno.test("service: a broken status API reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as Browse AI's reports unknown", async () => {
  const body = { ...SUMMARY, page: { ...SUMMARY.page, url: "https://someoneelse.statuspage.io" } };
  const { ctx } = mockCtx([{ status: 200, body }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("mapComponentStatus: maps the Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("mapIndicator: maps the page-level roll-up", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("componentKey: uses the vendor id, falling back to a name slug", () => {
  assertEquals(componentKey({ id: "abc" }, 0), "abc");
  assertEquals(componentKey({ name: "Public API" }, 2), "public-api-2");
  assertEquals(componentKey({}, 5), "component-5");
});

Deno.test("service: declares the status host in its own network.allow, unsigned", () => {
  assertEquals(service.network?.allow, ["browseai.statuspage.io"]);
  assertEquals(service.credential, "none");
});
