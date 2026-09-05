import { assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const SUMMARY = {
  page: { id: "01J", name: "Ticket Tailor", url: "https://status.tickettailor.com/" },
  status: { indicator: "none", description: "All Systems Operational" },
  components: [
    { id: "c1", name: "Check-in app", status: "operational" },
    { id: "c2", name: "Checkout", status: "operational" },
    { id: "c3", name: "Dashboard", status: "operational" },
    { id: "c4", name: "API", status: "operational" },
  ],
};

Deno.test("mapComponentStatus / mapIndicator: cover the documented vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");

  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("componentKey: uses the vendor id, falls back to a name slug", () => {
  assertEquals(componentKey({ id: "c1", name: "API" }, 0), "c1");
  assertEquals(componentKey({ name: "Check-in app" }, 2), "check-in-app-2");
  assertEquals(componentKey({}, 5), "component-5");
});

Deno.test("check: all-operational reports ok with four components", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: SUMMARY }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).length, 4);
});

Deno.test("check: a degraded component surfaces as degraded, with the affected name", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        ...SUMMARY,
        status: { indicator: "minor", description: "Partial outage" },
        components: [
          ...SUMMARY.components.slice(0, 3),
          { id: "c4", name: "API", status: "partial_outage" },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.components?.["c4"].state, "degraded");
});

Deno.test("check: a broken status endpoint reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("check: a page that no longer self-identifies as Ticket Tailor reports unknown", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { ...SUMMARY, page: { url: "https://status.example.com/" } } },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
