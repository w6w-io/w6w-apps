import { assert, assertEquals } from "@std/assert";
import service, {
  mapComponentStatus,
  MESSAGING_API_GROUP_NAME,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed from the live response measured 2026-09-05. */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "jncpmz37bpzt", name: "LINE API", url: "https://api.line-status.info" },
    components: [
      {
        id: "v36rt61zgx3m",
        name: "Messaging API",
        status: "operational",
        group: true,
        group_id: null,
        components: ["1mxy9pszm8pk", "bpyg5jrsxmlp"],
      },
      {
        id: "1mxy9pszm8pk",
        name: "API",
        status: "operational",
        group: false,
        group_id: "v36rt61zgx3m",
      },
      {
        id: "bpyg5jrsxmlp",
        name: "Webhook",
        status: "operational",
        group: false,
        group_id: "v36rt61zgx3m",
      },
      {
        id: "sqz36yfgmnb8",
        name: "LINE Login",
        status: "operational",
        group: false,
        group_id: null,
      },
      {
        id: "psvht6kdtpdz",
        name: "LINE Front-end Framework (LIFF)",
        status: "operational",
        group: false,
        group_id: null,
      },
    ],
    ...overrides,
  };
}

Deno.test("service: probes the status host, not the API host, unsigned", () => {
  assertEquals(STATUS_URL, "https://api.line-status.info/api/v2/summary.json");
  assertEquals(service.network?.allow, ["api.line-status.info"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: an all-operational Messaging API group reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
});

/**
 * The finding that shapes this check: the page also carries LINE Login and LIFF, which must never
 * affect this app's verdict.
 */
Deno.test("service: only the Messaging API group's own two components are scored", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  const keys = Object.keys(report.components ?? {});
  assertEquals(keys.sort(), ["1mxy9pszm8pk", "bpyg5jrsxmlp"]);
  assertEquals("sqz36yfgmnb8" in (report.components ?? {}), false);
  assertEquals("psvht6kdtpdz" in (report.components ?? {}), false);
});

Deno.test("service: an outage on LINE Login does not affect this app's verdict", async () => {
  const body = summary();
  (body.components[3] as { status: string }).status = "major_outage";
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok");
});

Deno.test("service: an outage on the Messaging API's own API component is reported", async () => {
  const body = summary();
  (body.components[1] as { status: string }).status = "major_outage";
  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "down");
  assertEquals(report.components?.["1mxy9pszm8pk"].state, "down");
  assertEquals(report.components?.["1mxy9pszm8pk"].message, "API: major_outage");
  assert(/API \(major_outage\)/.test(report.message ?? ""), report.message);
});

Deno.test("service: a failing status page reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page that stops self-identifying as LINE's reports unknown", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({ page: { id: "x", name: "Somebody Else", url: "https://status.other.com" } }),
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(/self-identifies/.test(report.message ?? ""), report.message);
});

Deno.test("service: a page that drops the Messaging API group reports unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ components: [] }) }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(report.message?.includes(MESSAGING_API_GROUP_NAME), report.message);
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
