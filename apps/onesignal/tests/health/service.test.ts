import { assertEquals } from "@std/assert";
import service, { componentKey, mapComponentStatus, mapIndicator } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("mapComponentStatus: covers Statuspage's documented vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(mapComponentStatus("something-new"), "unknown");
});

Deno.test("mapIndicator: covers the page-level roll-up vocabulary", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("componentKey: prefers the vendor id, falls back to a slug, then an index", () => {
  assertEquals(componentKey({ id: "abc123", name: "Push" }, 0), "abc123");
  assertEquals(componentKey({ name: "APIs & SDK Endpoints" }, 2), "apis-sdk-endpoints-2");
  assertEquals(componentKey({}, 5), "component-5");
});

Deno.test("check: all-operational summary reports ok with every component", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      page: { name: "OneSignal", url: "https://status.onesignal.com/" },
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { id: "c1", name: "Push", status: "operational" },
        { id: "c2", name: "Email", status: "operational" },
      ],
      incidents: [],
      scheduled_maintenances: [],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).length, 2);
  assertEquals(report.components?.c1.state, "ok");
});

Deno.test("check: a major outage on one component reports down and names it", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      page: { name: "OneSignal", url: "https://status.onesignal.com/" },
      status: { indicator: "critical", description: "Major outage" },
      components: [
        { id: "c1", name: "Push", status: "major_outage" },
        { id: "c2", name: "Email", status: "operational" },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.message?.includes("Push"), true);
});

Deno.test("check: group rows are excluded from the component map", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      page: { url: "https://status.onesignal.com/" },
      status: { indicator: "none" },
      components: [
        { id: "grp", name: "Everything", status: "operational", group: true },
        { id: "c1", name: "Push", status: "operational" },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["c1"]);
});

Deno.test("check: a broken status API reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("check: a page that no longer self-identifies as OneSignal reports unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      page: { url: "https://status.example.com/" },
      status: { indicator: "none" },
      components: [
        { id: "c1", name: "Thing", status: "operational" },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("check: unsigned posture, unauthenticated status call", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.onesignal.com"]);
});
