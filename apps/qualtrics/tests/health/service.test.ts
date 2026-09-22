import { assert, assertEquals } from "@std/assert";
import service, { API_COMPONENT_ID, mapComponentStatus, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed from the live response measured 2026-09-22 (36 components). */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "zzbcdhb83d4t", name: "Qualtrics", url: "https://status.qualtrics.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "trl6zc6sdcf4", name: "Survey Taking", status: "operational" },
      { id: "cxbbktbvpq7q", name: "Logins", status: "operational" },
      { id: "0g83y8c83cyz", name: "API / Developer Platform", status: "operational" },
      { id: "v1crb1dpsqkc", name: "Canada Endpoint", status: "degraded_performance" },
    ],
    ...overrides,
  };
}

Deno.test("service: probes the status host, not the API host", () => {
  assertEquals(STATUS_URL, "https://status.qualtrics.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.qualtrics.com"]);
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
});

Deno.test("service: a healthy API component reports ok, keyed by its vendor id", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.[API_COMPONENT_ID]?.message, "API / Developer Platform");
});

/**
 * The page-level indicator is a worst-of across all 36 components; a degraded
 * `Canada Endpoint` must not report the REST API degraded.
 */
Deno.test("service: another component's degradation does not move the verdict", async () => {
  const body = summary({ status: { indicator: "minor", description: "Partial outage" } });
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok");
});

Deno.test("service: the API component's own degradation does move the verdict", async () => {
  const body = summary();
  body.components[2].status = "major_outage";
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "down");
  assert(/major_outage/.test(report.message ?? ""), report.message);
});

Deno.test("service: a page missing the API component reports unknown", async () => {
  const body = summary({ components: [{ id: "x", name: "Logins", status: "operational" }] });
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(/API \/ Developer Platform/.test(report.message ?? ""), report.message);
});

/** A broken status API says nothing about Qualtrics — never `down`. */
Deno.test("service: a failing status page reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/** A healthy but wrongly-pointed page must not be trusted. */
Deno.test("service: a page that stops self-identifying as Qualtrics' reports unknown", async () => {
  const { ctx } = mockCtx([
    { body: summary({ page: { id: "x", name: "Other", url: "https://status.other.com" } }) },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(/self-identifies/.test(report.message ?? ""), report.message);
});

Deno.test("service: Statuspage's vocabulary maps to the four health states", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("something-new"), "unknown");
  assertEquals(mapComponentStatus(undefined), "unknown");
});
