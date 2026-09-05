import { assert, assertEquals } from "@std/assert";
import service, { API_COMPONENT_ID, mapComponentStatus, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(components: Array<{ id: string; name: string; status: string; group?: boolean }>) {
  return {
    page: { id: "g0qmjh0xkq5b", name: "Ontraport", url: "http://ontraportstatus.com" },
    components,
    incidents: [],
    scheduled_maintenances: [],
  };
}

Deno.test("service: STATUS_URL is Ontraport's own vanity Statuspage, not the redirecting decoy", () => {
  assertEquals(STATUS_URL, "https://ontraport.statuspage.io/api/v2/summary.json");
});

Deno.test("mapComponentStatus: Statuspage's documented vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(mapComponentStatus("something_new"), "unknown");
});

Deno.test("service: reports ok when the API component is operational", async () => {
  const { ctx } = mockCtx([{
    body: summary([{ id: API_COMPONENT_ID, name: "API", status: "operational" }]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: keys the verdict on the API component, not on unrelated components", async () => {
  const { ctx } = mockCtx([{
    body: summary([
      { id: API_COMPONENT_ID, name: "API", status: "operational" },
      { id: "l52ftt8qbl9q", name: "Hosted Wordpress Sites", status: "major_outage" },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok", "an outage in an unrelated component must not sink the verdict");
  assert(/Hosted Wordpress Sites/.test(report.message ?? ""), report.message);
});

Deno.test("service: reports down when the API component itself is down", async () => {
  const { ctx } = mockCtx([{
    body: summary([{ id: API_COMPONENT_ID, name: "API", status: "major_outage" }]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: a broken status endpoint reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as Ontraport's reports unknown", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { id: "x", name: "Some Other Product", url: "http://example.com" },
      components: [{ id: "1", name: "API", status: "operational" }],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page that no longer lists the API component reports unknown", async () => {
  const { ctx } = mockCtx([{
    body: summary([{ id: "someotherid", name: "Something Else", status: "operational" }]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: group rows are excluded from the reported components", async () => {
  const { ctx } = mockCtx([{
    body: summary([
      { id: API_COMPONENT_ID, name: "API", status: "operational" },
      { id: "grp1", name: "Backend Services", status: "operational", group: true },
    ]),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}).includes("grp1"), false);
});

Deno.test("service: declares no signed egress and is unsigned", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["ontraport.statuspage.io"]);
});
