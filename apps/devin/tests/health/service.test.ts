import { assert, assertEquals } from "@std/assert";
import service, {
  mapComponentStatus,
  STATUS_URL,
  TRACKED_COMPONENTS,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed from the live response measured 2026-09-05 (www.devinstatus.com, 10 components). */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "6bjrw54df4rj", name: "Devin", url: "https://www.devinstatus.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "d87cp5jknh1c", name: "Cloud Web Client", status: "operational" },
      { id: "q72cy1kjpk4r", name: "Cloud Agent", status: "operational" },
      { id: "c20stk646s0v", name: "Cloud Agent (Enterprise)", status: "operational" },
      { id: "h6z52njyz22z", name: "Desktop Agent", status: "operational" },
      { id: "hgmbfbs72ryp", name: "Integrations", status: "operational" },
    ],
    incidents: [],
    ...overrides,
  };
}

Deno.test("service: fetches the direct devinstatus.com host, not the redirecting status.devin.ai", () => {
  assertEquals(STATUS_URL, "https://www.devinstatus.com/api/v2/summary.json");
});

Deno.test("service: tracks exactly the two Cloud Agent components", () => {
  assertEquals(Object.keys(TRACKED_COMPONENTS).sort(), ["c20stk646s0v", "q72cy1kjpk4r"]);
});

Deno.test("mapComponentStatus: the five documented Statuspage component states", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: ok when both tracked Cloud Agent components are operational", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }], undefined);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).sort(), ["c20stk646s0v", "q72cy1kjpk4r"]);
});

Deno.test("service: an outage in Desktop Agent or Integrations never affects the verdict", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      components: [
        { id: "h6z52njyz22z", name: "Desktop Agent", status: "major_outage" },
        { id: "hgmbfbs72ryp", name: "Integrations", status: "major_outage" },
        { id: "q72cy1kjpk4r", name: "Cloud Agent", status: "operational" },
        { id: "c20stk646s0v", name: "Cloud Agent (Enterprise)", status: "operational" },
      ],
    }),
  }], undefined);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: degraded when Cloud Agent is degraded", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      components: [
        { id: "q72cy1kjpk4r", name: "Cloud Agent", status: "degraded_performance" },
        { id: "c20stk646s0v", name: "Cloud Agent (Enterprise)", status: "operational" },
      ],
    }),
  }], undefined);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("Cloud Agent"), report.message);
});

Deno.test("service: down when Cloud Agent (Enterprise) has a major outage", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      components: [
        { id: "q72cy1kjpk4r", name: "Cloud Agent", status: "operational" },
        { id: "c20stk646s0v", name: "Cloud Agent (Enterprise)", status: "major_outage" },
      ],
    }),
  }], undefined);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: unknown, never down, when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }], undefined);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: unknown when the page no longer self-identifies as Devin's", async () => {
  const { ctx } = mockCtx(
    [{ body: summary({ page: { url: "https://status.example.com" } }) }],
    undefined,
  );
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: unknown when neither Cloud Agent component is present anymore", async () => {
  const { ctx } = mockCtx([{
    body: summary({
      components: [{ id: "d87cp5jknh1c", name: "Cloud Web Client", status: "operational" }],
    }),
  }], undefined);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: never signs a credential and never reaches api.devin.ai", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["www.devinstatus.com"]);
});
