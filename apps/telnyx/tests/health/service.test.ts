import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

/** A trimmed slice of `status.telnyx.com/api/v2/summary.json`, as captured 2026-09-05. */
const COMPONENTS = [
  { name: "US East Region", status: "operational" },
  { name: "Inbound Calling Services - United States", status: "operational" },
  { name: "Outbound Calling Services - United States", status: "operational" },
  { name: "Outbound Calling Services - Canada", status: "operational" },
  { name: "API V2", status: "operational" },
  { name: "API V1", status: "degraded_performance" },
  { name: "Number Searching", status: "operational" },
  { name: "API V1", status: "operational" },
  { name: "Number Lookup API", status: "operational" },
  { name: "API V2", status: "degraded_performance" },
];

const summary = (
  components = COMPONENTS,
  status = { indicator: "none", description: "All Systems Operational" },
) => ({ status, components });

Deno.test("service: unsigned, app-scoped, and widens egress to the status host only", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.telnyx.com"]);
  assertEquals(service.credential, undefined);
  assertEquals(service.scope, undefined);
});

Deno.test("service: probes summary.json, unauthenticated", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: summary() }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.telnyx.com/api/v2/summary.json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("service: reports the page-level indicator as state", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summary() }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(result.message, "All Systems Operational");
});

Deno.test("service: maps minor/major/critical indicators to degraded/down/down", async () => {
  const cases: Array<[string, string]> = [
    ["minor", "degraded"],
    ["major", "down"],
    ["critical", "down"],
  ];
  for (const [indicator, expected] of cases) {
    const { ctx } = mockCtx([{
      status: 200,
      body: summary(COMPONENTS, { indicator, description: "x" }),
    }]);
    assertEquals((await service.check!({}, ctx)).state, expected, indicator);
  }
});

/**
 * Only the components that are UNIQUE in the vendor's own list are named —
 * "API V1"/"API V2" repeat with no group id to disambiguate them (see the
 * module doc), so they must never show up in `components`.
 */
Deno.test("service: names only the unambiguous components — never the duplicated API V1/V2", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summary() }]);
  const result = await service.check!({}, ctx);
  assertEquals(Object.keys(result.components!).sort(), [
    "number-lookup-api",
    "outbound-calling-services-canada",
    "outbound-calling-services-united-states",
  ]);
});

Deno.test("service: a named component reflects its own status, independent of the page rollup", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary(
      [
        { name: "Number Lookup API", status: "major_outage" },
        { name: "Outbound Calling Services - United States", status: "operational" },
        { name: "Outbound Calling Services - Canada", status: "operational" },
      ],
      { indicator: "minor", description: "Partial issue" },
    ),
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded"); // from the page-level indicator
  assertEquals(result.components!["number-lookup-api"].state, "down");
  assertEquals(result.components!["outbound-calling-services-united-states"].state, "ok");
});

/** A status page that is itself broken says nothing about the vendor. */
Deno.test("service: a failing status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(result.message!.includes("503"), result.message);
});

Deno.test("service: an unrecognised page indicator is unknown, not assumed ok", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary(COMPONENTS, { indicator: "who_knows", description: "?" }),
  }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: keeps the default degraded severity and a 60s interval", () => {
  assertEquals(service.severity, undefined);
  assertEquals(service.minIntervalSeconds, 60);
});
