import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";
import requestRate from "../../health/request-rate.ts";

/**
 * The page as measured on 2026-08-11: eleven flat components, no groups, and a
 * page block that self-identifies as ElevenLabs'.
 */
function summary(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    page: {
      id: "01JJM5RKYAEEAMBKYSDC0AAQ6Y",
      name: "ElevenLabs",
      url: "https://status.elevenlabs.io/",
    },
    components: [
      { id: "01JP2RQVGDHPEEDAFM5KV2MH9P", name: "Text to Speech", status: "operational" },
      { id: "01JYDTNNSJBT4X90MAC47YPM9S", name: "Speech to Text", status: "operational" },
      { id: "01JY3H5SJJFKTXYQHG5A8Z1KYH", name: "Other API endpoints", status: "operational" },
    ],
    incidents: [],
    scheduled_maintenances: [],
    status: { description: "All Systems Operational", indicator: "none" },
    ...over,
  };
}

Deno.test("service: an all-operational page reports ok with every component named", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(STATUS_URL, "https://status.elevenlabs.io/api/v2/summary.json");
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components!).length, 3);
  assertEquals(report.components!["01JP2RQVGDHPEEDAFM5KV2MH9P"].message, "Text to Speech");
});

/**
 * The page-level indicator is the vendor's own roll-up and is the verdict.
 * Deriving one from the component list would report a platform outage for a
 * single degraded peripheral.
 */
Deno.test("service: the verdict follows the page indicator, not the worst component", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      status: { description: "Partially Degraded Service", indicator: "minor" },
      components: [
        { id: "a", name: "Text to Speech", status: "operational" },
        { id: "b", name: "Telephony", status: "major_outage" },
      ],
    }),
  }]);
  const report = await service.check!({}, ctx);
  // `major_outage` on one component would be `down` if components drove it.
  assertEquals(report.state, "degraded");
  assertEquals(report.components!.b.state, "down");
  assertStringIncludes(report.message!, "Telephony (major_outage)");
});

Deno.test("service: with no indicator at all the worst component decides", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      status: undefined,
      components: [
        { id: "a", name: "Text to Speech", status: "operational" },
        { id: "b", name: "Telephony", status: "major_outage" },
      ],
    }),
  }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: open incidents and maintenance windows are counted in the message", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      incidents: [{ name: "Elevated latency", status: "investigating" }],
      scheduled_maintenances: [{}],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertStringIncludes(report.message!, "1 open incident(s)");
  assertStringIncludes(report.message!, "1 scheduled maintenance window(s)");
});

/** A broken status page says nothing about the vendor — never `down`. */
Deno.test("service: a 500 from the status page reports unknown", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertStringIncludes(report.message!, "500");
});

Deno.test("service: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as ElevenLabs' reports unknown", async () => {
  const { ctx } = mockCtx([{
    body: summary({ page: { name: "SomeoneElse", url: "https://status.example.com/" } }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assertStringIncludes(report.message!, "no longer self-identifies");
});

Deno.test("service: a page with no components reports unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ components: [] }) }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/**
 * ElevenLabs publishes no group rows today. The filter is kept so a future
 * grouping does not double-count its children, and this pins that behaviour.
 */
Deno.test("service: a container row would be filtered out rather than double-counted", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      components: [
        { id: "grp", name: "Storage", status: "operational", group: true },
        { id: "a", name: "Text to Speech", status: "operational", group_id: "grp" },
      ],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components!), ["a"]);
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

Deno.test("service: componentKey prefers the vendor id and slugs a name otherwise", () => {
  assertEquals(componentKey({ id: "abc", name: "Text to Speech" }, 0), "abc");
  assertEquals(componentKey({ name: "Text to Speech" }, 2), "text-to-speech-2");
  assertEquals(componentKey({}, 4), "component-4");
});

Deno.test("service: the status host is the check's own egress, and it is unsigned", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.elevenlabs.io"]);
});

// --- the declared absence ---------------------------------------------------

Deno.test("request-rate: the absence is declared, informational, and names what was checked", () => {
  assertEquals(requestRate.check, undefined, "an unavailable check must not also probe");
  assertEquals(requestRate.severity, "informational");
  const reason = requestRate.unavailable!.reason;
  assertStringIncludes(reason, "X-RateLimit-*");
  assertStringIncludes(reason, "rate_limit_exceeded");
  assertStringIncludes(reason, "concurrent_limit_exceeded");
  assert(reason.length > 100, "a declared absence with no explanation is just a gap");
});
