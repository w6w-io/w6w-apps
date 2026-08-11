import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import service, {
  findKeapGroupId,
  KEAP_GROUP_ID,
  keapComponents,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/**
 * A miniature of the real page: one Keap group with three children, and two
 * OTHER Thryv product groups whose children must never reach the verdict. The
 * real page carries 52 components in 6 groups, of which 8 are Keap's.
 */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "ddsc33xv5l8n", name: "Thryv", url: "https://status.thryv.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: KEAP_GROUP_ID, name: "Keap", group: true, group_id: null, status: "operational" },
      { id: "k-api", name: "APIs", group: false, group_id: KEAP_GROUP_ID, status: "operational" },
      {
        id: "k-auth",
        name: "Authentication",
        group: false,
        group_id: KEAP_GROUP_ID,
        status: "operational",
      },
      {
        id: "k-auto",
        name: "Automation",
        group: false,
        group_id: KEAP_GROUP_ID,
        status: "operational",
      },
      { id: "bc", name: "Business Center", group: true, group_id: null, status: "operational" },
      {
        id: "bc-web",
        name: "Website Builder",
        group: false,
        group_id: "bc",
        status: "operational",
      },
      { id: "mc", name: "Marketing Center", group: true, group_id: null, status: "operational" },
      {
        id: "mc-seo",
        name: "Marketing Center SEO",
        group: false,
        group_id: "mc",
        status: "operational",
      },
    ],
    incidents: [],
    scheduled_maintenances: [],
    ...overrides,
  };
}

Deno.test("service: the probe calls status.thryv.com directly, not the redirecting keap host", () => {
  // status.keap.com 301s to the APEX of status.thryv.com, dropping the path, so
  // every path there answers with the same 1.29 MB HTML. The runtime allowlists
  // the URL it is given, not the redirect target.
  assertEquals(STATUS_URL, "https://status.thryv.com/api/v2/summary.json");
  assert(!STATUS_URL.includes("status.keap.com"));
  assertEquals(service.network?.allow, ["status.thryv.com"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: statuspage component and indicator vocabularies map as documented", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("something_new"), "unknown");
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: the Keap group is found by name first, then by its published id", () => {
  const components = summary().components;
  assertEquals(findKeapGroupId(components), KEAP_GROUP_ID);
  // Renamed group, same id: the id fallback catches it.
  const renamed = components.map((c) => c.id === KEAP_GROUP_ID ? { ...c, name: "Keap CRM" } : c);
  assertEquals(findKeapGroupId(renamed), KEAP_GROUP_ID);
  // New id, same name: the name lookup catches it.
  const reissued = components.map((c) => c.id === KEAP_GROUP_ID ? { ...c, id: "brand-new" } : c)
    .map((c) => c.group_id === KEAP_GROUP_ID ? { ...c, group_id: "brand-new" } : c);
  assertEquals(findKeapGroupId(reissued), "brand-new");
});

Deno.test("service: only the Keap group's leaf components are collected", () => {
  const names = keapComponents(summary().components, KEAP_GROUP_ID).map((c) => c.name);
  assertEquals(names, ["APIs", "Authentication", "Automation"]);
});

Deno.test("service: a healthy Keap group reports ok with its components named", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).sort(), ["k-api", "k-auth", "k-auto"]);
  assertEquals(report.components!["k-api"].message, "APIs");
});

/**
 * The finding this whole check exists for. `status.indicator` rolls up 6 Thryv
 * product groups; trusting it — which every other Statuspage-backed app in this
 * pack correctly does — reports Keap down because Thryv's Website Builder is
 * down.
 */
Deno.test("service: another Thryv product being down does NOT make Keap down", async () => {
  const body = summary({ status: { indicator: "critical", description: "Major outage" } });
  body.components = body.components.map((c) =>
    c.id === "bc-web" ? { ...c, status: "major_outage" } : c
  );
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok", "the Thryv-wide indicator was read as Keap's verdict");
  // It is still reported, as context.
  assertStringIncludes(report.message!, "Thryv-wide indicator critical");
  assertStringIncludes(report.message!, "beyond Keap");
  // And the other product's component is not among the reported ones.
  assert(!("bc-web" in (report.components ?? {})));
});

Deno.test("service: a Keap component outage IS reported as down", async () => {
  const body = summary();
  body.components = body.components.map((c) =>
    c.id === "k-api" ? { ...c, status: "major_outage" } : c
  );
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertStringIncludes(report.message!, "APIs (major_outage)");
});

Deno.test("service: a degraded Keap component is degraded, not down", async () => {
  const body = summary();
  body.components = body.components.map((c) =>
    c.id === "k-auto" ? { ...c, status: "degraded_performance" } : c
  );
  const { ctx } = mockCtx([{ body }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertStringIncludes(report.message!, "500");
});

Deno.test("service: an unreadable body is unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as Thryv's is unknown", async () => {
  const { ctx } = mockCtx([{
    body: summary({ page: { name: "Someone Else", url: "https://status.example.com" } }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertStringIncludes(report.message!, "status.example.com");
});

/**
 * Falling back to the page indicator when the Keap group is gone would report
 * on Thryv while claiming to report on Keap. Saying "I cannot tell" is the
 * honest answer, and it must not be `ok`.
 */
Deno.test("service: a page with no Keap group reports unknown, not the Thryv indicator", async () => {
  const body = summary();
  body.components = body.components.filter((c) =>
    c.id !== KEAP_GROUP_ID && c.group_id !== KEAP_GROUP_ID
  );
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertStringIncludes(report.message!, "no longer publishes a Keap component group");
});

Deno.test("service: an empty Keap group reports unknown", async () => {
  const body = summary();
  body.components = body.components.filter((c) => c.group_id !== KEAP_GROUP_ID);
  const { ctx } = mockCtx([{ body }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: page-wide incident counts are labelled page-wide", async () => {
  const { ctx } = mockCtx([{
    body: summary({ incidents: [{ name: "Something on another product" }] }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertStringIncludes(report.message!, "1 open incident(s) page-wide");
});
