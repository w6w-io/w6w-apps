import { assert, assertEquals } from "@std/assert";
import service, {
  INCIDENTS_URL,
  mapImpact,
  reportFromIncidents,
  SELL_SERVICE_ID,
} from "../../health/service.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("mapImpact: the three observed impact values", () => {
  assertEquals(mapImpact("critical"), "down");
  assertEquals(mapImpact("major"), "degraded");
  assertEquals(mapImpact("minor"), "degraded");
  assertEquals(mapImpact(undefined), "unknown");
  assertEquals(mapImpact("something-new"), "unknown");
});

Deno.test("reportFromIncidents: ok when no incident touches the Sell service", () => {
  const body = {
    data: [
      {
        id: "1",
        attributes: {
          name: "Support outage",
          impact: "major",
          status: "monitoring",
          resolvedAt: null,
        },
      },
    ],
    included: [
      { type: "incidentService", attributes: { incidentId: 1, serviceId: 1 } }, // Support, not Sell
    ],
  };
  const report = reportFromIncidents(body);
  assertEquals(report.state, "ok");
  assertEquals(report.message, undefined);
});

Deno.test("reportFromIncidents: degraded when an OPEN incident touches Sell (serviceId 63)", () => {
  const body = {
    data: [
      {
        id: "10197",
        attributes: {
          name: "Third-Party Apps Experiencing Errors",
          impact: "major",
          status: "monitoring",
          startedAt: "2026-08-19T06:27:00.000Z",
          resolvedAt: null,
        },
      },
    ],
    included: [
      {
        type: "incidentService",
        attributes: { incidentId: 10197, serviceId: Number(SELL_SERVICE_ID) },
      },
    ],
  };
  const report = reportFromIncidents(body);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("Third-Party Apps Experiencing Errors"), report.message);
  assertEquals(report.timeline.length, 1);
  assertEquals(report.timeline[0].state, "degraded");
});

Deno.test("reportFromIncidents: a RESOLVED incident touching Sell does not affect current state", () => {
  const body = {
    data: [
      {
        id: "10181",
        attributes: {
          name: "Pod 28 & 29 Errors",
          impact: "major",
          status: "resolved",
          startedAt: "2026-08-13T15:14:00.000Z",
          resolvedAt: "2026-08-13T16:38:00.000Z",
        },
      },
    ],
    included: [
      {
        type: "incidentService",
        attributes: { incidentId: 10181, serviceId: Number(SELL_SERVICE_ID) },
      },
    ],
  };
  const report = reportFromIncidents(body);
  assertEquals(report.state, "ok");
  assertEquals(report.timeline[0].state, "ok");
  assertEquals(report.timeline[0].resolvedAt, "2026-08-13T16:38:00.000Z");
});

Deno.test("reportFromIncidents: critical impact reports down", () => {
  const body = {
    data: [{
      id: "1",
      attributes: {
        name: "Major outage",
        impact: "critical",
        status: "investigating",
        resolvedAt: null,
      },
    }],
    included: [{
      type: "incidentService",
      attributes: { incidentId: 1, serviceId: Number(SELL_SERVICE_ID) },
    }],
  };
  assertEquals(reportFromIncidents(body).state, "down");
});

Deno.test("reportFromIncidents: unrecognised shape reports unknown, not ok or down", () => {
  // deno-lint-ignore no-explicit-any
  const report = reportFromIncidents({} as any);
  assertEquals(report.state, "unknown");
});

Deno.test("service check: a non-OK status response reports unknown, never down", async () => {
  const { ctx, calls } = mockCtx([{ status: 500, body: "" }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assertEquals(pathOf(calls[0].url), new URL(INCIDENTS_URL).pathname);
});

Deno.test("service check: reports ok when the API answers with no open Sell incidents", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        data: [],
        included: [],
      },
    },
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
});

Deno.test("service: widens egress to status.zendesk.com and stays unsigned", () => {
  assertEquals(service.network?.allow, ["status.zendesk.com"]);
  assertEquals(service.credential, "none");
});
