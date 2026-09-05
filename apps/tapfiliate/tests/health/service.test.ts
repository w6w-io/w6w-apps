import { assert, assertEquals } from "@std/assert";
import service, { API_COMPONENT_NAME, componentKey, mapState } from "../../health/service.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("service: mapState — operational is ok, unrecognised is unknown (never ok)", () => {
  assertEquals(mapState("operational"), "ok");
  assertEquals(mapState("partial_outage"), "degraded");
  assertEquals(mapState("major_outage"), "down");
  assertEquals(mapState("under_maintenance"), "degraded");
  assertEquals(mapState("some-future-state-nobody-has-seen"), "unknown");
  assertEquals(mapState(undefined), "unknown");
});

Deno.test("componentKey: slugs a component name", () => {
  assertEquals(componentKey({ name: "Tapfiliate API" }, 0), "tapfiliate-api");
  assertEquals(componentKey({}, 3), "component-3");
});

const FIVE_COMPONENTS = [
  { id: 4718, name: "Tapfiliate API", state: "operational" },
  { id: 4719, name: "Tapfiliate Webapp", state: "operational" },
  { id: 4720, name: "Tapfiliate Tracking Servers", state: "operational" },
  { id: 4721, name: "Tapfiliate Tracking Script", state: "operational" },
  { id: 4722, name: "Tapfiliate Assets", state: "operational" },
];

Deno.test("service: all-operational reports ok and hits only the components endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { components: FIVE_COMPONENTS } }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(calls.length, 1);
  assertEquals(pathOf(calls[0].url), "/api/v1/components");
  assertEquals(Object.keys(report.components ?? {}).length, 5);
  assertEquals(report.components?.["tapfiliate-api"].state, "ok");
});

Deno.test("service: the verdict tracks ONLY the Tapfiliate API component", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        components: [
          { id: 4718, name: API_COMPONENT_NAME, state: "operational" },
          { id: 4719, name: "Tapfiliate Webapp", state: "major_outage" },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);

  // The dashboard being down does not make this REST-only app's verdict `down`.
  assertEquals(report.state, "ok");
  assert(report.message?.includes("Tapfiliate Webapp"), report.message);
});

Deno.test("service: a degraded API component IS reflected in the verdict", async () => {
  const { ctx } = mockCtx([
    { body: { components: [{ id: 4718, name: API_COMPONENT_NAME, state: "partial_outage" }] } },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("partial_outage"));
});

Deno.test("service: a broken status endpoint is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: an empty component list is unknown", async () => {
  const { ctx } = mockCtx([{ body: { components: [] } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: the API component going missing entirely is unknown, not silently ok", async () => {
  const { ctx } = mockCtx([
    { body: { components: [{ id: 4719, name: "Tapfiliate Webapp", state: "operational" }] } },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes(API_COMPONENT_NAME));
});

Deno.test("service: declares the correct allowlist, kind, and credential posture", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.tapfiliate.com"]);
});
