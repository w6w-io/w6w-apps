import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_ALLOW,
  STATUS_HOSTS,
  statusUrl,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed from the live US1 response measured 2026-08-11 (13,036 bytes, 39 components). */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: {
      id: "1k6wzpspjf99",
      name: "Datadog US1",
      url: "https://status.datadoghq.com",
      time_zone: "America/New_York",
    },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "p4hwj4wsc5wf", name: "APM", status: "operational", group: false },
      { id: "s6jxgrkjjj6p", name: "Monitors", status: "operational", group: false },
      { id: "1w2mz2hzw0cz", name: "Log Management", status: "operational", group: false },
      { id: "12txp202wv5s", name: "www.datadoghq.com", status: "operational", group: false },
    ],
    incidents: [],
    scheduled_maintenances: [],
    ...overrides,
  };
}

Deno.test("service: it is per-connection and unsigned, and widens egress to status hosts only", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "connection");
  assertEquals(service.credential, "context");
  assertEquals(service.network?.allow, STATUS_ALLOW);
  for (const host of service.network?.allow ?? []) {
    assert(host.startsWith("status."), `${host} is not a status host`);
  }
});

/**
 * The finding this whole check exists for: `status.datadoghq.com` speaks for US1
 * and no one else. Reading it for an EU1 connection would report the wrong
 * continent's weather.
 */
Deno.test("service: each site reads its own status page", async () => {
  for (const site of ["us1", "eu1", "ap2", "gov"] as const) {
    const { ctx, calls } = mockCtx([{
      body: summary({ page: { url: `https://${STATUS_HOSTS[site]}` } }),
    }], site);
    await service.check!({}, ctx);
    assertEquals(calls[0].url, statusUrl(STATUS_HOSTS[site]!));
  }
});

Deno.test("service: an all-operational page reports ok, naming the page", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, "https://status.datadoghq.com/api/v2/summary.json");
  assertEquals(report.state, "ok");
  assert(report.message?.includes("Datadog US1"), report.message);
  assert(report.message?.includes("All Systems Operational"), report.message);
  assertEquals(Object.keys(report.components ?? {}).length, 4);
  assertEquals(report.components?.p4hwj4wsc5wf?.message, "APM");
});

Deno.test("service: an incident is reported with the affected components named", async () => {
  const body = summary({
    status: { indicator: "major", description: "Partial System Outage" },
    incidents: [{ name: "Elevated monitor evaluation latency", status: "investigating" }],
  });
  body.components[1].status = "major_outage";

  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assertEquals(report.components?.s6jxgrkjjj6p?.state, "down");
  assert(/Monitors \(major_outage\)/.test(report.message ?? ""), report.message);
  assert(/1 open incident/.test(report.message ?? ""), report.message);
});

/**
 * UK1 is the one site Datadog gives no status page. Reporting `ok` there would
 * be a lie and reporting `down` a worse one, so it reports `unknown` and says
 * why — and makes no request at all.
 */
Deno.test("service: UK1 reports unknown with the reason, and never fetches", async () => {
  const { ctx, calls } = mockCtx([], "uk1");
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assertEquals(calls.length, 0);
  assert(report.message?.includes("no status page"), report.message);
  assert(report.message?.includes("UK1"), report.message);
  assert(report.message?.includes("`api` check"), report.message);
});

/** A broken status page says nothing about Datadog — never `down`. */
Deno.test("service: a failing status page reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");

  const unreadable = mockCtx([{ body: "not json" }]);
  assertEquals((await service.check!({}, unreadable.ctx)).state, "unknown");

  const empty = mockCtx([{ body: summary({ components: [] }) }]);
  assertEquals((await service.check!({}, empty.ctx)).state, "unknown");
});

/**
 * The failure mode a 200 cannot catch: a healthy, claimed status page that
 * belongs to a different product, reached through a redirect.
 */
Deno.test("service: a page that self-identifies as someone else reports unknown", async () => {
  const { ctx } = mockCtx([{
    body: summary({ page: { name: "Some Other Product", url: "https://status.example.com" } }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("no longer self-identifies"), report.message);
});

Deno.test("service: group containers are excluded from the component report", async () => {
  const body = summary();
  (body.components as Array<Record<string, unknown>>).push({
    id: "grp",
    name: "A group",
    status: "operational",
    group: true,
  });
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals("grp" in (report.components ?? {}), false);
});

Deno.test("service: Statuspage's component vocabulary maps to the four health states", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("something_new"), "unknown");
});

Deno.test("service: the page indicator maps to the four health states", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: components fall back to a slug when the vendor drops ids", () => {
  assertEquals(componentKey({ id: "abc", name: "APM" }, 0), "abc");
  assertEquals(componentKey({ name: "Log Management" }, 3), "log-management-3");
  assertEquals(componentKey({}, 7), "component-7");
});

Deno.test("service: the eight status URLs are all https and all end in summary.json", () => {
  assertEquals(STATUS_ALLOW.length, 8);
  for (const host of STATUS_ALLOW) {
    assertEquals(statusUrl(host), `https://${host}/api/v2/summary.json`);
  }
});
