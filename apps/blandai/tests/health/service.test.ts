import { assertEquals } from "@std/assert";
import service, { componentKey, mapComponentStatus, mapIndicator } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: mapComponentStatus covers the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(mapComponentStatus("something_new"), "unknown");
});

Deno.test("service: mapIndicator covers the page-level roll-up vocabulary", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: componentKey prefers the vendor id over the name", () => {
  assertEquals(componentKey({ id: "abc123", name: "API" }, 0), "abc123");
});

Deno.test("service: componentKey falls back to a name slug when id is absent", () => {
  assertEquals(componentKey({ name: "United States API" }, 2), "united-states-api-2");
});

Deno.test("service: componentKey falls back to an index when both are absent", () => {
  assertEquals(componentKey({}, 5), "component-5");
});

Deno.test("service: reports ok with per-component detail on a healthy page", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      page: { id: "3ll4lx1hjypr", name: "Bland AI", url: "https://status.bland.ai" },
      components: [
        { id: "us", name: "United States", status: "operational", group: true },
        { id: "api-us", name: "API", status: "operational", group_id: "us" },
        { id: "api-ca", name: "API", status: "operational", group_id: "ca" },
      ],
      incidents: [],
      scheduled_maintenances: [],
      status: { indicator: "none", description: "All Systems Operational" },
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, "https://status.bland.ai/api/v2/summary.json");
  // The group container is skipped; both same-named `API` rows are kept, keyed by id.
  assertEquals(Object.keys(report.components ?? {}).sort(), ["api-ca", "api-us"]);
});

Deno.test("service: reports degraded and names the affected component", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      page: { id: "3ll4lx1hjypr", name: "Bland AI", url: "https://status.bland.ai" },
      components: [{ id: "api-us", name: "API", status: "partial_outage" }],
      status: { indicator: "minor" },
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(/API \(partial_outage\)|API: partial_outage/.test(report.message ?? ""), true);
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "gateway error" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: an unreadable body is unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "not json",
    headers: { "content-type": "text/plain" },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as Bland's is unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      page: { id: "x", name: "Someone Else", url: "https://status.example.com" },
      components: [{ id: "a", name: "API", status: "operational" }],
      status: { indicator: "none" },
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: no components at all is unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      page: { url: "https://status.bland.ai" },
      components: [],
      status: { indicator: "none" },
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: is unsigned and declares its own network allowlist", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.bland.ai"]);
});
