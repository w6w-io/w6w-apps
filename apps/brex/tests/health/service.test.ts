import { assert, assertEquals } from "@std/assert";
import service, {
  API_COMPONENT,
  mapComponentStatus,
  slug,
  STATUS_HOST,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/**
 * Trimmed from the live response measured 2026-09-22: `page.name` "Brex", 11
 * components and no groups. Every component name is the vendor's, verbatim.
 */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "k2nlg36q7ljw", name: "Brex", url: "https://status.brex.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "mjm37m197f3v", name: "Partner API", status: "operational", group: false },
      {
        id: "qj9d7mydwxn5",
        name: "Money movement: card authorization",
        status: "operational",
        group: false,
      },
      { id: "3488m6h3ftr4", name: "Dashboard", status: "operational", group: false },
      { id: "wxd52fskq2pc", name: "Mobile", status: "operational", group: false },
      { id: "34d95z4py0mt", name: "Spend Management", status: "operational", group: false },
      { id: "yfjqftc7fcg5", name: "Authentication", status: "operational", group: false },
      { id: "kprttcwdjzw3", name: "Partner Integrations", status: "operational", group: false },
      { id: "4cwdpffqjj2m", name: "Brex Travel", status: "operational", group: false },
      { id: "slrmq15j8s82", name: "Bill Pay", status: "operational", group: false },
      { id: "587jn0fhy1sv", name: "Home Page", status: "operational", group: false },
      { id: "szw2y902q0c0", name: "Banking", status: "operational", group: false },
    ],
    ...overrides,
  };
}

Deno.test("service: probes the status host, unsigned, as a service check", () => {
  assertEquals(STATUS_URL, "https://status.brex.com/api/v2/summary.json");
  assertEquals(STATUS_HOST, "status.brex.com");
  assertEquals(service.network?.allow, ["status.brex.com"]);
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  // A vendor incident is evidence, not a verdict on one workflow.
  assertEquals(service.severity, "informational");
});

Deno.test("service: an all-operational page reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.message, "Partner API operational");
});

Deno.test("service: every component is reported as detail, keyed by a readable slug", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(Object.keys(report.components ?? {}).length, 11);
  assertEquals(report.components?.["partner-api"], { state: "ok" });
  // The colons and spaces in the vendor's names would be unusable as keys.
  assertEquals(report.components?.["money-movement-card-authorization"], { state: "ok" });
});

/**
 * The whole point of following one component: Brex's dashboard, mobile, travel
 * and bill-pay surfaces are different products, and an outage on one of them
 * says nothing about the 23 calls this app makes to api.brex.com.
 */
Deno.test("service: another product's outage does not change this app's verdict", async () => {
  const body = summary();
  body.components[2].status = "major_outage";
  body.components[4].status = "degraded_performance";
  const { ctx } = mockCtx([{ body }]);

  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.dashboard, { state: "down", message: "major_outage" });
  assertEquals(report.components?.["spend-management"], {
    state: "degraded",
    message: "degraded_performance",
  });
});

Deno.test("service: a Partner API incident is the verdict", async () => {
  const body = summary();
  body.components[0].status = "partial_outage";
  const { ctx } = mockCtx([{ body }]);

  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.message, "Partner API: partial_outage");
});

Deno.test("service: a Partner API major outage reports down", async () => {
  const body = summary();
  body.components[0].status = "major_outage";
  const { ctx } = mockCtx([{ body }]);

  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.["partner-api"], {
    state: "down",
    message: "major_outage",
  });
});

/** A page-wide indicator is not a statement about api.brex.com, so it is not read. */
Deno.test("service: the page-level indicator never becomes the verdict", async () => {
  const { ctx } = mockCtx([
    { body: summary({ status: { indicator: "critical", description: "Major Outage" } }) },
  ]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

/**
 * The component is matched by NAME, anchored. It was `mjm37m197f3v` when read,
 * but ids change when a component is recreated and this app should not have to
 * be redeployed when they do.
 */
Deno.test("service: the component is matched by anchored name, not by id", async () => {
  const body = summary();
  // Same name, a new id — still the component this app follows.
  body.components[0].id = "a-brand-new-id";
  const { ctx } = mockCtx([{ body }]);
  assertEquals((await service.check!({}, ctx)).message, "Partner API operational");

  // And an anchored match, so a future "Partner API Gateway" is not substituted.
  assert(API_COMPONENT.test("Partner API"));
  assert(API_COMPONENT.test("partner api"));
  assert(!API_COMPONENT.test("Partner API Gateway"));
  assert(!API_COMPONENT.test("Partner Integrations"));
  // The check trims the vendor's name before testing it, so surrounding
  // whitespace never decides the match.
  const padded = summary();
  padded.components[0].name = "  Partner API  ";
  const paddedCtx = mockCtx([{ body: padded }]);
  assertEquals((await service.check!({}, paddedCtx.ctx)).state, "ok");
});

Deno.test("service: a page without the Partner API component reports unknown", async () => {
  const body = summary({
    components: [{ id: "x", name: "Dashboard", status: "operational", group: false }],
  });
  const { ctx } = mockCtx([{ body }]);

  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/no component named "Partner API"/.test(report.message ?? ""), report.message);
  // The rest of the page is still reported, so the answer is not empty.
  assertEquals(Object.keys(report.components ?? {}), ["dashboard"]);
});

/** A broken status API says nothing about Brex — never `down`. */
Deno.test("service: a failing status page reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a status page that cannot be reached reports unknown", async () => {
  // An empty mock queue makes the fake fetch throw, standing in for a DNS or TLS
  // failure — the check must swallow it and say `unknown`, never `down`.
  const { ctx } = mockCtx([]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/could not reach/.test(report.message ?? ""), report.message);
});

Deno.test("service: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page with no components reports unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ components: [] }) }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/**
 * The failure mode this guards is a healthy, claimed status page that belongs to
 * an entirely different product after a redirect or a rebrand.
 */
Deno.test("service: a page that stops self-identifying as Brex's reports unknown", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({
        page: { id: "x", name: "Somebody Else", url: "https://status.other.com" },
      }),
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

Deno.test("service: slug makes a readable key out of any component name", () => {
  assertEquals(slug("Partner API"), "partner-api");
  assertEquals(slug("Money movement: card authorization"), "money-movement-card-authorization");
  assertEquals(slug("  "), "");
});
