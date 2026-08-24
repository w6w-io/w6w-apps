import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { API_COMPONENT_IDS } from "../../health/service.ts";

/** Builds a whole `/api/v2.0.0/current` response body. */
function statusBody(activeIncidents: Array<Record<string, unknown>>) {
  return {
    status: "active",
    date_created: "2026-01-01T00:00:00-07:00",
    date_updated: "2026-01-01T00:00:00-07:00",
    active_incidents: activeIncidents,
  };
}

/** F1's incident, verbatim from the live body quoted in the contract. */
const F1_INCIDENT = {
  id: 1576,
  title: "Trouble Accessing Historical Messages With Custom Data Retention Policies Enabled",
  type: "incident",
  status: "active",
  url: "https://slack-status.com/2026-08/e07b9271f0346c3b",
  date_created: "2026-08-13T14:21:41-07:00",
  date_updated: "2026-08-20T15:54:59-07:00",
  services: ["Messaging", "Workspace/Org Administration"],
};

Deno.test("service: names the one surface this app's Actions depend on", () => {
  assertEquals([...API_COMPONENT_IDS], ["apps-integrations-apis"]);
  assertEquals(service.covers, ["*", "component:apps-integrations-apis"]);
});

// F1 — an incident naming only surfaces we don't call: headline stays ok, but
// every surface it names is still reported, and it still gets a timeline entry.
Deno.test("service: F1 — an incident off our surface does not degrade the headline", async () => {
  const { ctx } = mockCtx([{ status: 200, body: statusBody([F1_INCIDENT]) }]);
  const result = await service.check!({}, ctx);

  assertEquals(result.state, "ok");
  assertEquals(result.components?.["messaging"]?.state, "degraded");
  assertEquals(result.components?.["workspace-org-administration"]?.state, "degraded");

  assertEquals(result.timeline?.length, 1);
  const entry = result.timeline![0];
  assertEquals(entry.id, "https://slack-status.com/2026-08/e07b9271f0346c3b");
  assertEquals(entry.startedAt, "2026-08-13T21:21:41.000Z");
  assertEquals(entry.updatedAt, "2026-08-20T22:54:59.000Z");
});

// F2 — same incident, but naming our own surface: headline degrades.
Deno.test("service: F2 — an incident on our surface degrades the headline", async () => {
  const incident = { ...F1_INCIDENT, services: ["Apps/Integrations/APIs"] };
  const { ctx } = mockCtx([{ status: 200, body: statusBody([incident]) }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
});

// F3 — an outage on our surface: headline goes down.
Deno.test("service: F3 — an outage on our surface reports down", async () => {
  const incident = { ...F1_INCIDENT, type: "outage", services: ["Apps/Integrations/APIs"] };
  const { ctx } = mockCtx([{ status: 200, body: statusBody([incident]) }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
});

// F4 — an outage NOT on our surface: headline stays ok, component still down.
Deno.test("service: F4 — an outage off our surface leaves the headline ok", async () => {
  const incident = { ...F1_INCIDENT, type: "outage", services: ["Files"] };
  const { ctx } = mockCtx([{ status: 200, body: statusBody([incident]) }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(result.components?.["files"]?.state, "down");
});

// F5 — no `services` named at all: the conservative arm counts it toward us.
Deno.test("service: F5 — an incident with no services named counts toward the headline", async () => {
  const incident = { ...F1_INCIDENT, services: undefined };
  delete (incident as Record<string, unknown>).services;
  const { ctx } = mockCtx([{ status: 200, body: statusBody([incident]) }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
});

// F6 — two incidents, one ours and one not: only ours decides the headline,
// but `components` still carries every surface of both.
Deno.test("service: F6 — the headline reflects only our incident, components carry both", async () => {
  const ours = {
    ...F1_INCIDENT,
    id: 1,
    url: "https://slack-status.com/2026-08/ours",
    services: ["Apps/Integrations/APIs"],
  };
  const notOurs = {
    ...F1_INCIDENT,
    id: 2,
    url: "https://slack-status.com/2026-08/not-ours",
    type: "notice",
    services: ["Files"],
  };
  const { ctx } = mockCtx([{ status: 200, body: statusBody([ours, notOurs]) }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assertEquals(result.components?.["apps-integrations-apis"]?.state, "degraded");
  assertEquals(result.components?.["files"]?.state, "ok");
  assertEquals(result.timeline?.length, 2);
});

// F7 — the all-clear path publishes a positive empty timeline, not undefined.
Deno.test("service: F7 — no active incidents is ok with an explicit empty timeline", async () => {
  const { ctx } = mockCtx([{ status: 200, body: statusBody([]) }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(result.timeline, []);
  assertEquals(result.ttlSeconds, 60);
});

// F8 — a broken status API is unknown, never down — existing behaviour, unchanged.
Deno.test("service: F8 — a non-2xx from the status API is unknown", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "nope" }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

// The Web API's own component id must survive round-trip through `slug()`
// unchanged, since A5's `covers` entry and every `components` key for an
// incident naming our surface both depend on that.
Deno.test("service: an incident naming our surface exactly, slugs to our id", async () => {
  const incident = { ...F1_INCIDENT, services: ["Apps/Integrations/APIs"] };
  const { ctx } = mockCtx([{ status: 200, body: statusBody([incident]) }]);
  const result = await service.check!({}, ctx);
  assert(Object.keys(result.components ?? {}).includes("apps-integrations-apis"));
});
