import { assertEquals } from "@std/assert";
import service, {
  componentState,
  mapComponentStatus,
  mapIncidentImpact,
  mapPageStatus,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("mapPageStatus: Instatus's documented page-level vocabulary", () => {
  assertEquals(mapPageStatus("UP"), "ok");
  assertEquals(mapPageStatus("HASISSUES"), "degraded");
  assertEquals(mapPageStatus("UNDERMAINTENANCE"), "degraded");
  assertEquals(mapPageStatus("SOMETHING_NEW"), "unknown");
  assertEquals(mapPageStatus(undefined), "unknown");
});

Deno.test("mapComponentStatus: confirmed component/outage vocabulary", () => {
  assertEquals(mapComponentStatus("OPERATIONAL"), "ok");
  assertEquals(mapComponentStatus("PARTIALOUTAGE"), "degraded");
  assertEquals(mapComponentStatus("MAJOROUTAGE"), "down");
  assertEquals(mapComponentStatus("SOMETHING_NEW"), "unknown");
});

Deno.test("mapIncidentImpact: an unrecognised impact still reads as at least degraded, never ok/unknown", () => {
  assertEquals(mapIncidentImpact("MAJOROUTAGE"), "down");
  assertEquals(mapIncidentImpact("PARTIALOUTAGE"), "degraded");
  assertEquals(mapIncidentImpact("SOME_FUTURE_CODE"), "degraded");
  assertEquals(mapIncidentImpact(undefined), "degraded");
});

/**
 * The confirmed live finding: a component's own `status` reads OPERATIONAL
 * while it carries an open MAJOROUTAGE incident. `componentState` must not
 * trust `status` alone.
 */
Deno.test("componentState: takes the worse of a component's status and its open incidents", () => {
  const state = componentState({
    name: "Video Render Service",
    status: "OPERATIONAL",
    activeIncidents: [{ status: "INVESTIGATING", impact: "MAJOROUTAGE" }],
  });
  assertEquals(state, "down");
});

Deno.test("componentState: an operational component with no incidents is ok", () => {
  assertEquals(componentState({ name: "OpusClip", status: "OPERATIONAL" }), "ok");
});

Deno.test("service.check: a healthy page with all-operational components reports ok", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { page: { name: "OpusClip", url: "https://status.opus.pro", status: "UP" } } },
    {
      status: 200,
      body: {
        components: [
          { id: "c1", name: "OpusClip", status: "OPERATIONAL" },
          { id: "c2", name: "Video Import Service", status: "OPERATIONAL" },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service.check: an active MAJOROUTAGE incident on an OPERATIONAL component reports down", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { page: { name: "OpusClip", url: "https://status.opus.pro", status: "UP" } } },
    {
      status: 200,
      body: {
        components: [
          {
            id: "c1",
            name: "Video Render Service",
            status: "OPERATIONAL",
            activeIncidents: [{ name: "Render issues", status: "INVESTIGATING", impact: "MAJOROUTAGE" }],
          },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.["c1"].state, "down");
});

Deno.test("service.check: a wrong page.name (Instatus multi-tenant misroute) reports unknown", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { page: { name: "Some Other Product", url: "https://v2.instatus.com" } } },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service.check: a broken status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: is unsigned and app-scoped, widening egress to status.opus.pro only", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
  assertEquals(service.network?.allow, ["status.opus.pro"]);
});
