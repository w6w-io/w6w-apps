import { assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("STATUS_URL: is Dialpad's own Statuspage summary endpoint", () => {
  assertEquals(STATUS_URL, "https://status.dialpad.com/api/v2/summary.json");
});

Deno.test("mapComponentStatus: the documented Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(mapComponentStatus("something-new"), "unknown");
});

Deno.test("mapIndicator: the page-level roll-up vocabulary", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("componentKey: prefers the vendor's id", () => {
  assertEquals(componentKey({ id: "abc123", name: "API Platform" }, 0), "abc123");
});

Deno.test("componentKey: falls back to a slug of the name", () => {
  assertEquals(componentKey({ name: "API Platform" }, 3), "api-platform-3");
});

Deno.test("componentKey: falls back to an index when there is nothing else", () => {
  assertEquals(componentKey({}, 5), "component-5");
});

const SUMMARY = {
  page: { id: "80trk830s0hg", name: "Dialpad", url: "https://status.dialpad.com" },
  components: [
    { id: "a", name: "Application", status: "operational", group: false, group_id: null },
    { id: "b", name: "API Platform", status: "operational", group: false, group_id: null },
  ],
  incidents: [],
  scheduled_maintenances: [],
  status: { indicator: "none", description: "All Systems Operational" },
};

Deno.test("check: all-operational summary reports ok with per-component detail", async () => {
  const { ctx } = mockCtx([{ status: 200, body: SUMMARY }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.a.state, "ok");
  assertEquals(report.components?.b.state, "ok");
});

Deno.test("check: a degraded component surfaces in the message", async () => {
  const degraded = {
    ...SUMMARY,
    components: [
      { id: "a", name: "Application", status: "operational", group: false, group_id: null },
      { id: "b", name: "API Platform", status: "partial_outage", group: false, group_id: null },
    ],
    status: { indicator: "minor", description: "Partial API Platform outage" },
  };
  const { ctx } = mockCtx([{ status: 200, body: degraded }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.message?.includes("API Platform"), true);
});

Deno.test("check: a broken status API reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("check: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "not json",
    headers: { "content-type": "text/plain" },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("check: a page that no longer self-identifies as Dialpad's reports unknown", async () => {
  const spoofed = { ...SUMMARY, page: { ...SUMMARY.page, url: "https://status.example.com" } };
  const { ctx } = mockCtx([{ status: 200, body: spoofed }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("check: a component-free page reports unknown rather than a false ok", async () => {
  const empty = { ...SUMMARY, components: [] };
  const { ctx } = mockCtx([{ status: 200, body: empty }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("declared metadata: app-scoped, unsigned, and widens egress to the status host only", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.dialpad.com"]);
});
