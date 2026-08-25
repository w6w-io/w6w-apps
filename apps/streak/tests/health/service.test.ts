import { assert, assertEquals } from "@std/assert";
import service, { API_COMPONENT_ID, mapComponentStatus, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(components: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}) {
  return {
    page: { id: "7kv7scdrc87y", name: "Streak", url: "https://status.streak.com" },
    components,
    incidents: [],
    scheduled_maintenances: [],
    status: { indicator: "none" },
    ...extra,
  };
}

const OPERATIONAL = [
  { id: "qhwk22n52r8h", name: "streak.com", status: "operational" },
  { id: API_COMPONENT_ID, name: "Streak API", status: "operational" },
  { id: "b3wmzbbtvxnp", name: "Streak for Gmail (desktop)", status: "operational" },
];

Deno.test("mapComponentStatus: the four documented Statuspage states", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: fetches the documented summary URL", async () => {
  const { ctx, calls } = mockCtx([{ body: summary(OPERATIONAL) }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
});

Deno.test("service: all-operational (including the API component) reports ok", async () => {
  const { ctx } = mockCtx([{ body: summary(OPERATIONAL) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

/**
 * The verdict tracks the 'Streak API' component specifically, not the
 * page-level indicator — a client-app-only outage must not fail this app's
 * health, and an API outage must not be masked by three healthy clients.
 */
Deno.test("service: a Streak API outage reports down even with a clean page indicator", async () => {
  const components = [
    { id: "qhwk22n52r8h", name: "streak.com", status: "operational" },
    { id: API_COMPONENT_ID, name: "Streak API", status: "major_outage" },
  ];
  const { ctx } = mockCtx([{ body: summary(components, { status: { indicator: "critical" } }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message?.includes("Streak API"), report.message);
});

Deno.test("service: an unrelated client-app outage does not fail this app's verdict", async () => {
  const components = [
    { id: API_COMPONENT_ID, name: "Streak API", status: "operational" },
    { id: "y6jc3p8l5z49", name: "Streak for iOS", status: "major_outage" },
  ];
  const { ctx } = mockCtx([{ body: summary(components, { status: { indicator: "major" } }) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(report.message?.includes("Streak for iOS"), report.message);
});

Deno.test("service: a missing 'Streak API' component reports unknown, not ok", async () => {
  const components = [{ id: "qhwk22n52r8h", name: "streak.com", status: "operational" }];
  const { ctx } = mockCtx([{ body: summary(components) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a broken status API reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page that stops self-identifying as Streak's reports unknown", async () => {
  const { ctx } = mockCtx([{
    body: summary(OPERATIONAL, {
      page: { id: "x", name: "Streak", url: "https://status.example.com" },
    }),
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: declares kind service, app scope, and no credential", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.streak.com"]);
});
