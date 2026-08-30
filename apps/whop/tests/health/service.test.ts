import { assert, assertEquals } from "@std/assert";
import service, { componentKey, mapComponentStatus, mapIndicator } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: mapComponentStatus covers the Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(mapComponentStatus("something-new"), "unknown");
});

Deno.test("service: mapIndicator covers the page-level vocabulary", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: componentKey prefers the vendor id, falls back to a name slug", () => {
  assertEquals(componentKey({ id: "abc123", name: "Website" }, 0), "abc123");
  assertEquals(componentKey({ name: "Android App" }, 1), "android-app-1");
  assertEquals(componentKey({}, 2), "component-2");
});

Deno.test("service: reports ok when every component is operational", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { name: "Whop", url: "https://status.whop.com/" },
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { id: "c1", name: "Website", status: "operational" },
        { id: "c2", name: "Android App", status: "operational" },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.c1.state, "ok");
});

Deno.test("service: reports the affected component by name in the message", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { name: "Whop", url: "https://status.whop.com/" },
      status: { indicator: "critical", description: "Full outage" },
      components: [{ id: "c1", name: "Website", status: "major_outage" }],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message?.includes("Website"), report.message);
});

Deno.test("service: a broken status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{ body: "not json" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as Whop's reports unknown", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { name: "Some Other Product", url: "https://status.example.com/" },
      status: { indicator: "none" },
      components: [{ id: "c1", name: "API", status: "operational" }],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: no components reports unknown", async () => {
  const { ctx } = mockCtx([{
    body: { page: { name: "Whop" }, status: { indicator: "none" }, components: [] },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: is app-scoped, unsigned, and allows only status.whop.com", () => {
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.whop.com"]);
});
