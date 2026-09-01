import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
  STATUS_USER_AGENT,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed from the live response measured 2026-09-01 (1,841 bytes, 5 components). */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "279mxqd36pgx", name: "Reply", url: "http://status.reply.io" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "224s3drvgzms", name: "Reply Web Application", status: "operational", group: false },
      { id: "h3b9mrg95rhv", name: "Reply API", status: "operational", group: false },
      { id: "gc445msfrjfb", name: "Reply Company Website", status: "operational", group: false },
    ],
    scheduled_maintenances: [],
    ...overrides,
  };
}

Deno.test("service: probes the status host, not the API host, unsigned, with an explicit UA", async () => {
  assertEquals(STATUS_URL, "https://status.reply.io/api/v2/summary.json");
  assertEquals(service.network?.allow, ["status.reply.io"]);
  assertEquals(service.credential, "none");

  const { ctx, calls } = mockCtx([{ body: summary() }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].headers["user-agent"], STATUS_USER_AGENT);
});

/**
 * The finding this check exists to survive: status.reply.io 403s a request
 * with no distinctive User-Agent. This test only proves the header is SENT —
 * see the module doc for the live measurement that motivated it.
 */
Deno.test("service: sends a non-empty, non-default User-Agent on every probe", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  await service.check!({}, ctx);
  const ua = calls[0].headers["user-agent"];
  assert(ua && ua.length > 0 && !/^curl\//.test(ua) && ua !== "Mozilla/5.0", ua);
});

Deno.test("service: an all-operational page reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
});

Deno.test("service: components are keyed by vendor id, named in the message", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(Object.keys(report.components ?? {}).length, 3);
  assertEquals(report.components?.h3b9mrg95rhv?.message, "Reply API");
});

Deno.test("service: an incident is reported with the affected component named", async () => {
  const body = summary({
    status: { indicator: "major", description: "Partial System Outage" },
    incidents: [{ name: "Elevated API errors", status: "investigating" }],
  });
  body.components[1].status = "major_outage";

  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assertEquals(report.components?.h3b9mrg95rhv?.state, "down");
  assert(/Reply API \(major_outage\)/.test(report.message ?? ""), report.message);
  assert(/1 open incident/.test(report.message ?? ""), report.message);
});

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

/** Guards against a redirect or rebrand silently pointing this probe at someone else's page. */
Deno.test("service: a page that stops self-identifying as Reply's reports unknown", async () => {
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
  assertEquals(componentKey({ name: "Reply API" }, 3), "reply-api-3");
  assertEquals(componentKey({}, 7), "component-7");
});

Deno.test("service: with no indicator the verdict is the worst component", async () => {
  const body = summary({ status: undefined });
  body.components[1].status = "major_outage";
  const { ctx } = mockCtx([{ body }]);

  assertEquals((await service.check!({}, ctx)).state, "down");
});
