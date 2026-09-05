import { assert, assertEquals } from "@std/assert";
import service, { API_COMPONENT_ID, mapComponentStatus, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed from the live response measured 2026-09-05 against givebutter.statuspage.io. */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "tlbvt02ychn9", name: "Givebutter", url: "https://givebutter.statuspage.io" },
    components: [
      { id: "p4d69b7xw9zv", name: "Dashboard", status: "operational" },
      { id: "dxjrbjlczs5q", name: "Campaigns", status: "operational" },
      { id: API_COMPONENT_ID, name: "API", status: "operational" },
    ],
    incidents: [],
    ...overrides,
  };
}

Deno.test("service: probes the real Statuspage host, unsigned", () => {
  assertEquals(STATUS_URL, "https://givebutter.statuspage.io/api/v2/summary.json");
  assertEquals(service.network?.allow, ["givebutter.statuspage.io"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: an operational API component reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
});

/** The Dashboard/Campaigns web components are NOT this app's dependency — only API is watched. */
Deno.test("service: a Dashboard outage does not affect the verdict, only the API component does", async () => {
  const body = summary();
  (body.components[0] as { status: string }).status = "major_outage"; // Dashboard
  const { ctx } = mockCtx([{ body }]);

  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}), [API_COMPONENT_ID]);
});

Deno.test("service: an API outage reports down, with the API component named", async () => {
  const body = summary();
  const api = body.components.find((c) => c.id === API_COMPONENT_ID)!;
  api.status = "major_outage";
  const { ctx } = mockCtx([{ body }]);

  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.[API_COMPONENT_ID]?.state, "down");
  assert(/API: major_outage/.test(report.message ?? ""), report.message);
});

Deno.test("service: a degraded API is reported as degraded", async () => {
  const body = summary();
  const api = body.components.find((c) => c.id === API_COMPONENT_ID)!;
  api.status = "degraded_performance";
  const { ctx } = mockCtx([{ body }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

/** A broken status API says nothing about Givebutter — never `down`. */
Deno.test("service: a failing status page reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/** Guards against a redirect/rebrand silently pointing this probe at a different page. */
Deno.test("service: a page that no longer self-identifies as Givebutter's reports unknown", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({ page: { id: "x", name: "Somebody Else", url: "https://status.other.com" } }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/self-identifies/.test(report.message ?? ""), report.message);
});

Deno.test("service: a page whose feed no longer lists the API component reports unknown", async () => {
  const body = summary();
  body.components = body.components.filter((c) => c.id !== API_COMPONENT_ID);
  const { ctx } = mockCtx([{ body }]);

  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/no longer lists/.test(report.message ?? ""), report.message);
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
