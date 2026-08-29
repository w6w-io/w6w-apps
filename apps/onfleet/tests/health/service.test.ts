import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const page = (components: Array<Record<string, unknown>>) => ({
  status: 200,
  body: { components },
});

Deno.test("service: reads status.onfleet.com", () => {
  assertEquals(service.network!.allow, ["status.onfleet.com"]);
});

Deno.test("service: the API component alone decides the verdict", async () => {
  const { ctx, calls } = mockCtx([page([
    { name: "API", status: "operational" },
    { name: "Dashboard", status: "operational" },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.onfleet.com/api/v2/components.json");
  assertEquals(result.state, "ok");
  assertEquals(Object.keys(result.components!).sort(), ["api", "dashboard"]);
});

/** A Dashboard/Maps/driver-app outage is named but does not change the verdict. */
Deno.test("service: a non-API outage is named but does not count", async () => {
  const { ctx } = mockCtx([page([
    { name: "API", status: "operational" },
    { name: "Dashboard", status: "major_outage" },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assert(/also affected: Dashboard/.test(result.message!), result.message);
});

Deno.test("service: an outage of the API component itself is down", async () => {
  const { ctx } = mockCtx([page([{ name: "API", status: "major_outage" }])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/API/.test(result.message!), result.message);
});

Deno.test("service: degraded API performance is degraded", async () => {
  const { ctx } = mockCtx([page([{ name: "API", status: "degraded_performance" }])]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: component groups are skipped, not counted twice", async () => {
  const { ctx } = mockCtx([page([
    { name: "API", status: "major_outage", group: true },
    { name: "API", status: "operational" },
  ])]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: a page of the wrong shape is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { nope: true } }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");

  const broken = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, broken.ctx)).state, "unknown");
});

Deno.test("service: a page naming no API component cannot produce a verdict", async () => {
  const { ctx } = mockCtx([page([{ name: "Dashboard", status: "operational" }])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/no longer names an `API`/.test(result.message!), result.message);
});
