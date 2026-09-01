import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: probes status.lokalise.com's summary endpoint", () => {
  assertEquals(STATUS_URL, "https://status.lokalise.com/api/v2/summary.json");
});

Deno.test("mapComponentStatus: covers the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(mapComponentStatus("something-new"), "unknown");
});

Deno.test("mapIndicator: covers the documented page-level vocabulary", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("componentKey: prefers the vendor id, falls back to a slug of the name", () => {
  assertEquals(componentKey({ id: "fh6b9vjjhldj", name: "Lokalise API" }, 0), "fh6b9vjjhldj");
  assertEquals(componentKey({ name: "Lokalise API" }, 2), "lokalise-api-2");
  assertEquals(componentKey({}, 3), "component-3");
});

Deno.test("service: all-operational summary reports ok", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        page: { id: "v7htgzpzxwsh", name: "Lokalise", url: "https://status.lokalise.com" },
        components: [
          { id: "1", name: "Lokalise.com", status: "operational" },
          { id: "2", name: "Lokalise API", status: "operational" },
        ],
        incidents: [],
        scheduled_maintenances: [],
        status: { indicator: "none", description: "All Systems Operational" },
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).length, 2);
});

Deno.test("service: a degraded component surfaces in the message", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        page: { url: "https://status.lokalise.com" },
        components: [{ id: "2", name: "Lokalise API", status: "partial_outage" }],
        incidents: [{ name: "API slowness", status: "investigating" }],
        status: { indicator: "minor" },
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("Lokalise API"));
  assert(report.message?.includes("1 open incident"));
});

Deno.test("service: group rows are excluded so they are never double-counted", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        page: { url: "https://status.lokalise.com" },
        components: [
          { id: "g1", name: "A group", status: "operational", group: true },
          { id: "c1", name: "Real component", status: "operational" },
        ],
        status: { indicator: "none" },
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["c1"]);
});

Deno.test("service: a non-2xx from the status host is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as Lokalise's is unknown", async () => {
  const { ctx } = mockCtx([
    { body: { page: { url: "https://status.example.com" }, components: [], status: {} } },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: is unsigned and app-scoped, and its own allowlist names only the status host", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
  assertEquals(service.network?.allow, ["status.lokalise.com"]);
});
