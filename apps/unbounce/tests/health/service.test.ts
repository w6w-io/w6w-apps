import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  STATUS_URL,
  TARGET_COMPONENT_NAME,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Shaped like the live response measured 2026-08-30 (13,898 bytes, 38 components). */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "ywsbtsrktl04", name: "Unbounce", url: "https://status.unbounce.com" },
    components: [
      { id: "4l0sjp2mmxxw", name: "Main Web Site and Blog (unbounce.com)", status: "operational" },
      { id: "5vb2jz2tzzjs", name: "Web Application (app.unbounce.com)", status: "operational" },
      { id: "y2sjjpdr1njt", name: "Partner API", status: "operational" },
      { id: "2v5x7k8dz3yc", name: "AWS ec2-us-west-1", status: "operational" },
    ],
    incidents: [],
    scheduled_maintenances: [],
    ...overrides,
  };
}

Deno.test("service: probes the status host unsigned, not the API host", () => {
  assertEquals(STATUS_URL, "https://status.unbounce.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.unbounce.com"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: the verdict is the Partner API component's own state, not the page indicator", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
});

/**
 * The failure mode this guards: a marketing-site or AWS-infra incident must
 * NOT report this app's own surface (api.unbounce.com) as down.
 */
Deno.test("service: an outage on an unrelated component does not affect the verdict", async () => {
  const body = summary();
  body.components[0].status = "major_outage"; // Main Web Site and Blog
  body.components[3].status = "major_outage"; // an AWS row
  const { ctx } = mockCtx([{ body }]);

  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  // Still surfaced in the detail map, just not driving the verdict.
  assertEquals(report.components?.["4l0sjp2mmxxw"]?.state, "down");
});

Deno.test("service: an outage on the Partner API component itself is reported down", async () => {
  const body = summary();
  body.components[2].status = "major_outage"; // Partner API
  const { ctx } = mockCtx([{ body }]);

  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(/Partner API: major_outage/.test(report.message ?? ""), report.message);
});

Deno.test("service: a page that stops listing a Partner API component reports unknown", async () => {
  const body = summary({
    components: [{ id: "4l0sjp2mmxxw", name: "Main Web Site and Blog", status: "operational" }],
  });
  const { ctx } = mockCtx([{ body }]);

  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(/no longer lists a "Partner API"/.test(report.message ?? ""), report.message);
});

Deno.test("service: a failing status page reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page that stops self-identifying as Unbounce's reports unknown", async () => {
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
});

Deno.test("service: componentKey prefers the vendor id and falls back to a slug", () => {
  assertEquals(componentKey({ id: "abc", name: "API" }, 0), "abc");
  assertEquals(componentKey({ name: "Partner API" }, 3), "partner-api-3");
  assertEquals(componentKey({}, 7), "component-7");
});

Deno.test("service: the target-component matcher is case-insensitive on the exact label", () => {
  assert(TARGET_COMPONENT_NAME.test("Partner API"));
  assert(TARGET_COMPONENT_NAME.test("partner api"));
  assert(!TARGET_COMPONENT_NAME.test("Web Application (app.unbounce.com)"));
});
