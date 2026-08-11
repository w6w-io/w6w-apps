import { assert, assertEquals } from "@std/assert";
import check, { mapComponentStatus, mapIndicator, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** The live body, trimmed — measured 2026-08-11. Note: no `incidents` key. */
const LIVE = {
  page: {
    id: "01KAV9NPWC7R8X5V06H38T4WES",
    name: "EmailOctopus",
    url: "https://status.emailoctopus.com/",
  },
  status: { description: "All Systems Operational", indicator: "none" },
  components: [{
    id: "01KAV9NPZSDHJNRM949CJ9Q2W8",
    name: "Platform",
    status: "operational",
  }],
};

Deno.test("service: is an unsigned app-scoped check that widens egress to the status host only", () => {
  assertEquals(check.kind, "service");
  assertEquals(check.scope, "app");
  assertEquals(check.credential, "none");
  assertEquals(check.network?.allow, ["status.emailoctopus.com"]);
  assertEquals(STATUS_URL, "https://status.emailoctopus.com/api/v2/summary.json");
});

Deno.test("service: reports ok with the single Platform component", async () => {
  const { ctx, calls } = mockCtx([{ body: LIVE }]);
  const report = await check.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
  assertEquals(report.components, { platform: { state: "ok" } });
});

Deno.test("service: survives a body with no incidents key at all", async () => {
  // incident.io omits `incidents` and `scheduled_maintenances` entirely rather
  // than sending `[]`; reading `.length` unguarded would throw.
  const { ctx } = mockCtx([{ body: LIVE }]);
  assert(!("incidents" in LIVE));
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: maps a degraded component and names it in the message", async () => {
  const { ctx } = mockCtx([{
    body: {
      ...LIVE,
      status: { description: "Partial outage", indicator: "major" },
      components: [{ id: "x", name: "Platform", status: "partial_outage" }],
      incidents: [{ name: "Sending delays", status: "investigating" }],
    },
  }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "degraded", "`major` is the indicator, mapped to degraded");
  assertEquals(report.components!.platform.state, "degraded");
  assert(report.message!.includes("Platform (partial_outage)"));
  assert(report.message!.includes("1 open incident"));
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("500"));
});

Deno.test("service: an unreadable body is unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "not json" }]);
  assertEquals((await check.check!({}, ctx)).state, "unknown");
});

Deno.test("service: refuses a page that no longer self-identifies as EmailOctopus", async () => {
  const { ctx } = mockCtx([{ body: { ...LIVE, page: { name: "Some Other Product" } } }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("Some Other Product"));
});

Deno.test("service: maps the Statuspage vocabularies", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("something-new"), "unknown");
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});
