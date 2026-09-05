import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed from the live response measured 2026-09-05 (6,354 bytes, 19 components). */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: {
      id: "80nxcgd5stc9",
      name: "Omnisend",
      url: "https://status.omnisend.com",
    },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "ws8jtf4qh11n", name: "Channels", status: "operational", group: true },
      { id: "wk5pd3ysnpk0", name: "Email", status: "operational", group: false },
      {
        id: "5z6cc3w3x0ms",
        name: "API",
        status: "operational",
        group: false,
        group_id: "2bqmnzpqy8st",
      },
      { id: "2bqmnzpqy8st", name: "Product Area", status: "operational", group: true },
    ],
    scheduled_maintenances: [],
    ...overrides,
  };
}

Deno.test("service: probes the status host, not the API host", () => {
  assertEquals(STATUS_URL, "https://status.omnisend.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.omnisend.com"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: an all-operational page reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
});

/**
 * `group: true` rows are containers whose status mirrors their children.
 * Reporting them would double-count every grouped service.
 */
Deno.test("service: group containers are excluded from the component report", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(Object.keys(report.components ?? {}).length, 2);
  assertEquals("ws8jtf4qh11n" in (report.components ?? {}), false);
  assertEquals("2bqmnzpqy8st" in (report.components ?? {}), false);
});

/** Components are keyed by the vendor's stable id, with the name in the message. */
Deno.test("service: components are keyed by vendor id", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.components?.["5z6cc3w3x0ms"]?.message, "API");
});

Deno.test("service: an incident is reported with the affected components named", async () => {
  const body = summary({
    status: { indicator: "major", description: "Partial System Outage" },
    incidents: [{ name: "Elevated send delays", status: "investigating" }],
  });
  body.components[2].status = "major_outage";

  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assertEquals(report.components?.["5z6cc3w3x0ms"]?.state, "down");
  assert(/API \(major_outage\)/.test(report.message ?? ""), report.message);
  assert(/1 open incident/.test(report.message ?? ""), report.message);
});

/** A broken status API says nothing about Omnisend — never `down`. */
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

/**
 * The failure mode this guards is a healthy, claimed status page that belongs
 * to an entirely different product after a redirect or rebrand.
 */
Deno.test("service: a page that stops self-identifying as Omnisend's reports unknown", async () => {
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
  assertEquals(componentKey({ name: "Push Notifications" }, 3), "push-notifications-3");
  assertEquals(componentKey({}, 7), "component-7");
});

/**
 * With no page-level indicator the verdict falls back to the worst component,
 * which is what keeps a future page shape from reporting a silent `ok`.
 */
Deno.test("service: with no indicator the verdict is the worst component", async () => {
  const body = summary({ status: undefined });
  body.components[1].status = "major_outage";
  const { ctx } = mockCtx([{ body }]);

  assertEquals((await service.check!({}, ctx)).state, "down");
});
