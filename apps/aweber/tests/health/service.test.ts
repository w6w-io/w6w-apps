import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed from the live response measured 2026-09-05 (3,865 bytes, 10 components). */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "bjqyd6ttxjk7", name: "AWeber", url: "https://status.aweber.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "tq19tr3284fk", name: "Main Site", status: "operational" },
      { id: "72bj56l4x80q", name: "API", status: "operational" },
      { id: "8fy78fpjct72", name: "Email Sending", status: "operational" },
    ],
    scheduled_maintenances: [],
    ...overrides,
  };
}

Deno.test("service: probes the status host, not the API host", () => {
  assertEquals(STATUS_URL, "https://status.aweber.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.aweber.com"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: an all-operational page reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
});

Deno.test("service: components are keyed by vendor id, including the API component", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(Object.keys(report.components ?? {}).length, 3);
  assertEquals(report.components?.["72bj56l4x80q"]?.message, "API");
});

Deno.test("service: an incident is reported with the affected component named", async () => {
  const body = summary({
    status: { indicator: "major", description: "Partial System Outage" },
    incidents: [{ name: "Elevated API errors", status: "investigating" }],
  });
  body.components[1].status = "major_outage";

  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assertEquals(report.components?.["72bj56l4x80q"]?.state, "down");
  assert(/API \(major_outage\)/.test(report.message ?? ""), report.message);
  assert(/1 open incident/.test(report.message ?? ""), report.message);
});

Deno.test("service: a failing status page reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page with no components reports unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ components: [] }) }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page that stops self-identifying as AWeber's reports unknown", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({ page: { id: "x", name: "Somebody Else", url: "https://status.other.com" } }),
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(/self-identifies/.test(report.message ?? ""), report.message);
});

Deno.test("service: Statuspage's component vocabulary maps to the four health states", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("something-new"), "unknown");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: the page indicator maps to the four health states", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: componentKey prefers the vendor id and falls back to a slug", () => {
  assertEquals(componentKey({ id: "abc", name: "API" }, 0), "abc");
  assertEquals(componentKey({ name: "Main Site" }, 3), "main-site-3");
  assertEquals(componentKey({}, 7), "component-7");
});

Deno.test("service: with no indicator the verdict is the worst component", async () => {
  const body = summary({ status: undefined });
  body.components[1].status = "major_outage";
  const { ctx } = mockCtx([{ body }]);

  assertEquals((await service.check!({}, ctx)).state, "down");
});
