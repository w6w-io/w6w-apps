import { assertEquals } from "@std/assert";
import service, {
  mapComponentStatus,
  mapIndicator,
  PUBLIC_API_COMPONENT_ID,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: mapComponentStatus covers the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: mapIndicator covers the page-level roll-up vocabulary", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: an all-operational page with a healthy Public API reports ok", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        page: { url: "https://status.personio.de" },
        components: [
          { id: PUBLIC_API_COMPONENT_ID, name: "Public API", status: "operational" },
        ],
        status: { indicator: "none", description: "All Systems Operational" },
        incidents: [],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.[PUBLIC_API_COMPONENT_ID].state, "ok");
});

Deno.test("service: a major outage on the Public API component reports down even if the page indicator lags", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        page: { url: "https://status.personio.de" },
        components: [
          { id: PUBLIC_API_COMPONENT_ID, name: "Public API", status: "major_outage" },
        ],
        // Page-level indicator understates it — the component reading must win.
        status: { indicator: "minor" },
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.[PUBLIC_API_COMPONENT_ID].state, "down");
});

Deno.test("service: an incident elsewhere on the page (not Public API) does not report down via the component reading", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        page: { url: "https://status.personio.de" },
        components: [
          { id: PUBLIC_API_COMPONENT_ID, name: "Public API", status: "operational" },
          { id: "other", name: "Payroll", status: "major_outage" },
        ],
        status: { indicator: "none" },
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.components?.[PUBLIC_API_COMPONENT_ID].state, "ok");
});

Deno.test("service: a broken status API is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as Personio's is unknown", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { page: { url: "https://status.someoneelse.com" }, components: [] } },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: is unsigned and app-scoped, and only widens egress to its own status host", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
  assertEquals(service.network?.allow, ["status.personio.de"]);
});
