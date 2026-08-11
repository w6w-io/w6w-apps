import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** The shape and content measured at status.podio.com on 2026-08-11. */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: {
      id: "p556j9m0x9q8",
      name: "Podio Status Page",
      url: "https://status.podio.com",
    },
    components: [
      { id: "b7kn63c65wgn", name: "Web", status: "operational" },
      { id: "xclqkr4s5kyn", name: "API", status: "operational" },
      { id: "ct1xxlnr04wf", name: "Email", status: "operational" },
      { id: "xz6fl23pdf5n", name: "Advanced Workflow Automation", status: "operational" },
      {
        id: "h2d56qvkv6f4",
        name: "Advanced Workflow Automation Failover Queue",
        status: "operational",
      },
    ],
    incidents: [],
    scheduled_maintenances: [],
    status: { indicator: "none", description: "All Systems Operational" },
    ...overrides,
  };
}

Deno.test("service: is declared unsigned and widens egress only to the status host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.podio.com"]);
  assertEquals(STATUS_URL, "https://status.podio.com/api/v2/summary.json");
});

Deno.test("service: reads summary.json, which carries components status.json does not", () => {
  assert(STATUS_URL.endsWith("/summary.json"));
});

Deno.test("service: all-operational reports ok with every component named", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(Object.keys(report.components ?? {}).length, 5);
  // The API component is the one this app actually depends on.
  assertEquals(report.components!["xclqkr4s5kyn"], { state: "ok", message: "API" });
  assertEquals(report.message, "All Systems Operational");
});

/**
 * The page indicator is Podio's own roll-up and is the verdict. Deriving one
 * from the component list would let the failover queue — an internal detail of
 * a feature this app never touches — report Podio as down.
 */
Deno.test("service: the page indicator is the verdict, components are the detail", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { id: "xclqkr4s5kyn", name: "API", status: "operational" },
        { id: "h2d56qvkv6f4", name: "AWA Failover Queue", status: "major_outage" },
      ],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok", "a component outage overrode Podio's own roll-up");
  assertEquals(report.components!["h2d56qvkv6f4"].state, "down");
  assert(report.message!.includes("AWA Failover Queue (major_outage)"));
});

Deno.test("service: with no indicator at all it falls back to the worst component", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      status: undefined,
      components: [
        { id: "a", name: "Web", status: "operational" },
        { id: "b", name: "API", status: "partial_outage" },
      ],
    }),
  }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const failing = mockCtx([{ status: 500, body: "" }]);
  assertEquals(await service.check!({}, failing.ctx), {
    state: "unknown",
    message: "Status page returned 500",
  });

  const unreadable = mockCtx([{ status: 200, body: "not json" }]);
  assertEquals((await service.check!({}, unreadable.ctx)).state, "unknown");

  const empty = mockCtx([{ body: summary({ components: [] }) }]);
  assertEquals((await service.check!({}, empty.ctx)).state, "unknown");
});

/**
 * The failure mode this guards is a healthy, claimed status page that belongs
 * to a different product after a rebrand or a redirect.
 */
Deno.test("service: a page that stops self-identifying as Podio's reports unknown", async () => {
  const { ctx } = mockCtx([{
    body: summary({ page: { name: "Somebody Else", url: "https://status.example.com" } }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no longer self-identifies"));
});

Deno.test("service: group container rows are excluded so nothing is double-counted", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      components: [
        { id: "grp", name: "Storage", status: "operational", group: true },
        { id: "kid", name: "API", status: "operational", group_id: "grp" },
      ],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(Object.keys(report.components ?? {}), ["kid"]);
});

Deno.test("service: open incidents and maintenance windows are counted into the message", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      status: { indicator: "minor", description: "Partially Degraded Service" },
      incidents: [{ name: "API latency" }],
      scheduled_maintenances: [{}, {}],
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message!.includes("1 open incident(s)"));
  assert(report.message!.includes("2 scheduled maintenance window(s)"));
});

Deno.test("mapComponentStatus: Statuspage's documented vocabulary, with unknown for the rest", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("something_new"), "unknown");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("mapIndicator: none/minor/major/critical/maintenance, with unknown for the rest", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator("what"), "unknown");
});

Deno.test("componentKey: prefers the vendor id, slugs the name, then falls back to the index", () => {
  assertEquals(componentKey({ id: "abc", name: "API" }, 0), "abc");
  assertEquals(
    componentKey({ name: "Advanced Workflow Automation" }, 3),
    "advanced-workflow-automation-3",
  );
  assertEquals(componentKey({}, 7), "component-7");
});
