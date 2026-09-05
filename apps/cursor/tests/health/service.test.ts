import { assert, assertEquals } from "@std/assert";
import service, { capAtDegraded, mapComponentStatus, mapIndicator } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("mapComponentStatus: maps the documented Statuspage vocabulary", () => {
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
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("capAtDegraded: never reports down — this page names no Admin API component", () => {
  assertEquals(capAtDegraded("down"), "degraded");
  assertEquals(capAtDegraded("degraded"), "degraded");
  assertEquals(capAtDegraded("ok"), "ok");
  assertEquals(capAtDegraded("unknown"), "unknown");
});

Deno.test("check: all-operational page reports ok", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        page: { id: "0tp9ssgtptvs", name: "Cursor", url: "https://status.cursor.com" },
        components: [
          { id: "a", name: "IDE", status: "operational" },
          { id: "b", name: "Cloud Agents", status: "operational" },
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

Deno.test("check: a major outage is reported as degraded, never down", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        page: { id: "0tp9ssgtptvs", name: "Cursor", url: "https://status.cursor.com" },
        components: [{ id: "a", name: "Cloud Agents", status: "major_outage" }],
        incidents: [{ name: "Cloud Agents down", status: "investigating" }],
        scheduled_maintenances: [],
        status: { indicator: "critical", description: "Major outage" },
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("does not name the Admin/Teams API"));
});

Deno.test("check: a broken status endpoint is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("check: a page that no longer self-identifies as Cursor's is unknown", async () => {
  const { ctx } = mockCtx([
    { body: { page: { url: "https://status.example.com" }, components: [], status: {} } },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service check: unsigned, app-scoped, and widens egress only to status.cursor.com", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
  assertEquals(service.network?.allow, ["status.cursor.com"]);
});
