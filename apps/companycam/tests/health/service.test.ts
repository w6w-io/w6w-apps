import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

/** The seven components measured on status.companycam.com on 2026-08-11. */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "y2vs4kl36flt", name: "CompanyCam", url: "https://status.companycam.com" },
    components: [
      { id: "n5595r721mdr", name: "API", status: "operational", group: false },
      { id: "m58pfzz47flx", name: "Web App", status: "operational", group: false },
      { id: "wcmkdhs44hgb", name: "Uploads & Processing", status: "operational", group: false },
      { id: "082dd4pcvl54", name: "Search", status: "operational", group: false },
      { id: "7jg07br5j6bg", name: "Mobile App", status: "operational", group: false },
      { id: "aaa111", name: "Integrations", status: "operational", group: false },
      { id: "bbb222", name: "Notifications", status: "operational", group: false },
    ],
    incidents: [],
    scheduled_maintenances: [],
    status: { indicator: "none", description: "All Systems Operational" },
    ...overrides,
  };
}

Deno.test("service: probes the CompanyCam status page, unsigned", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(calls[0].headers.authorization, undefined, "a status host must never be signed");
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).length, 7);
  // The API component is the one that speaks for this app's calls.
  assertEquals(report.components?.["n5595r721mdr"], { state: "ok", message: "API" });
});

Deno.test("service: the declared host is the status host, not the API host", () => {
  assertEquals(service.network?.allow, ["status.companycam.com"]);
  assertEquals(service.credential, "none");
  assertEquals(new URL(STATUS_URL).hostname, "status.companycam.com");
});

Deno.test("service: a degraded component is named in the message", async () => {
  const body = summary();
  body.components[2] = {
    id: "wcmkdhs44hgb",
    name: "Uploads & Processing",
    status: "partial_outage",
    group: false,
  };
  body.status = { indicator: "minor", description: "Partially Degraded Service" };
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message!.includes("Uploads & Processing"), report.message);
  assertEquals(report.components?.["wcmkdhs44hgb"].state, "degraded");
});

Deno.test("service: a major outage on the page is down", async () => {
  const { ctx } = mockCtx([{
    body: summary({ status: { indicator: "critical", description: "Major Outage" } }),
  }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: open incidents and maintenance windows are counted", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      incidents: [{ name: "Elevated API errors", status: "investigating" }],
      scheduled_maintenances: [{}],
      status: { indicator: "minor", description: "Partially Degraded Service" },
    }),
  }]);
  const report = await service.check!({}, ctx);
  assert(report.message!.includes("1 open incident(s)"), report.message);
  assert(report.message!.includes("1 scheduled maintenance window(s)"), report.message);
});

/** A broken status page says nothing about the vendor — never `down`. */
Deno.test("service: a failing status page is unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("503"));
});

Deno.test("service: an unreadable body is unknown", async () => {
  const { ctx } = mockCtx([{ body: "not json", headers: { "content-type": "text/plain" } }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page that no longer identifies as CompanyCam's is unknown", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      page: { id: "x", name: "Someone Else", url: "https://status.someoneelse.com" },
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no longer self-identifies"), report.message);
});

Deno.test("service: a page with no components is unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ components: [] }) }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: group rows are not counted as components", async () => {
  const body = summary();
  body.components.push({ id: "grp", name: "Platform", status: "operational", group: true });
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}).length, 7);
});

Deno.test("service: the Statuspage vocabularies map as documented", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("something_new"), "unknown");

  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: components fall back to a slug when the vendor drops ids", () => {
  assertEquals(componentKey({ id: "abc", name: "API" }, 0), "abc");
  assertEquals(componentKey({ name: "Uploads & Processing" }, 3), "uploads-processing-3");
  assertEquals(componentKey({}, 5), "component-5");
});

/**
 * The quota check is a declared absence. `informational` is what stops it
 * pinning the app's roll-up at `unknown` forever.
 */
Deno.test("quota: is a declared absence with a reason, and informational", () => {
  assertEquals(quota.check, undefined);
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable!.reason.length > 40, "the absence needs an actual reason");
  assert(/rate-limit|rate limit/.test(quota.unavailable!.reason), quota.unavailable!.reason);
});
