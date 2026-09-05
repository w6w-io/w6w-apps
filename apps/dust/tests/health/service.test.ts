import { assert, assertEquals } from "@std/assert";
import service, { mapComponentStatus, mapIndicator, STATUS_URL } from "../../health/service.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { url: "https://status.dust.tt" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { name: "API", status: "operational" },
      { name: "Conversations", status: "operational" },
      { name: "Data Sources", status: "operational" },
      { name: "us-central1", status: "operational" },
      { name: "europe-west1", status: "operational" },
      // Irrelevant components this check must ignore:
      { name: "Dust App Platform", status: "major_outage" },
      { name: "Connection - Slack", status: "major_outage" },
      { name: "Testing Component", status: "major_outage" },
      { name: "Dust Application", status: "operational", group: true },
    ],
    incidents: [],
    scheduled_maintenances: [],
    ...overrides,
  };
}

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
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: calls status.dust.tt/api/v2/summary.json", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
});

Deno.test("service: all-operational reports ok and only the five relevant components", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(
    Object.keys(report.components ?? {}).sort(),
    ["api", "conversations", "data-sources", "europe-west1", "us-central1"],
  );
  // The three irrelevant-but-broken components must not leak into the report.
  assert(!("dust-app-platform" in (report.components ?? {})));
});

Deno.test("service: a major outage on a relevant component reports down", async () => {
  const body = summary();
  (body.components[0] as { status: string }).status = "major_outage"; // API
  body.status = { indicator: "critical", description: "API outage" };
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "down");
  assertEquals(report.components?.api.state, "down");
  assert(report.message?.includes("API"), report.message);
});

Deno.test("service: an outage on an EXCLUDED component does not affect the verdict", async () => {
  // Dust App Platform and Connection - Slack are already major_outage in the
  // base fixture, but the page-level indicator is what this check trusts.
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: a broken status API is reported unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: an unreadable body is reported unknown", async () => {
  const { ctx } = mockCtx([{ body: "not json", headers: { "content-type": "text/plain" } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as Dust's is reported unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ page: { url: "https://status.example.com" } }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: declares status.dust.tt in its own network allowlist, unsigned", () => {
  assertEquals(service.network, { allow: ["status.dust.tt"] });
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
});

Deno.test("service: STATUS_URL's path matches what the check fetches", () => {
  assertEquals(pathOf(STATUS_URL), "/api/v2/summary.json");
});
