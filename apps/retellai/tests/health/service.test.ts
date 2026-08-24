import { assertEquals } from "@std/assert";
import service, { componentKey, mapComponentStatus, mapIndicator } from "../../health/service.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("service: maps Statuspage's component vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: maps the page-level indicator", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: componentKey prefers the vendor's own id", () => {
  assertEquals(componentKey({ id: "lwx818h8c19p", name: "API" }, 0), "lwx818h8c19p");
  assertEquals(componentKey({ name: "Phone Call" }, 2), "phone-call-2");
  assertEquals(componentKey({}, 5), "component-5");
});

Deno.test("service: check() reads status.retellai.com and reports the page indicator", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      page: { url: "https://status.retellai.com" },
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { id: "lwx818h8c19p", name: "API", status: "operational", group: false },
        { id: "8v2910yllbb6", name: "Phone Call", status: "operational", group: false },
        { id: "0f986dpn56cp", name: "End to End Calling", status: "operational", group: true },
      ],
      incidents: [],
      scheduled_maintenances: [],
    },
  }]);

  const report = await service.check!({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/summary.json");
  assertEquals(report.state, "ok");
  // Group rows are excluded — only the two leaf components are reported.
  assertEquals(Object.keys(report.components ?? {}).length, 2);
});

Deno.test("service: check() surfaces an affected component in the message", async () => {
  const { ctx } = mockCtx([{
    body: {
      page: { url: "https://status.retellai.com" },
      status: { indicator: "minor", description: "Partial API degradation" },
      components: [
        { id: "lwx818h8c19p", name: "API", status: "degraded_performance", group: false },
      ],
    },
  }]);

  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.message?.includes("API (degraded_performance)"), true);
});

Deno.test("service: check() is unknown, not down, when the status page itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: check() refuses to trust a page that no longer self-identifies as Retell's", async () => {
  const { ctx } = mockCtx([{ body: { page: { url: "https://status.example.com" } } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
