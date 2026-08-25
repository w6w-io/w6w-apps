import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/service.ts";

const page = (components: Array<Record<string, unknown>>) => ({
  status: 200,
  body: { components },
});

Deno.test("service: fetches status.shipstation.com/api/v2/components.json", async () => {
  const { ctx, calls } = mockCtx([page([
    { name: "Companion API V2", status: "operational", group: false, group_id: "c2q5" },
  ])]);
  await check.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.shipstation.com/api/v2/components.json");
});

Deno.test("service: ok when Companion API V2 is operational", async () => {
  const { ctx } = mockCtx([page([
    { name: "Companion API V2", status: "operational", group: false, group_id: "c2q5" },
    { name: "Companion API V1", status: "major_outage", group: false, group_id: "c2q5" },
  ])]);
  const result = await check.check!({}, ctx);
  // V1 being down must NOT affect this app's verdict — it never calls V1.
  assertEquals(result.state, "ok");
});

Deno.test("service: down follows Companion API V2 alone, ignoring carriers", async () => {
  const { ctx } = mockCtx([page([
    { name: "Companion API V2", status: "major_outage", group: false, group_id: "c2q5" },
    { name: "UPS", status: "operational", group: false, group_id: "carriers1" },
  ])]);
  const result = await check.check!({}, ctx);
  assertEquals(result.state, "down");
});

Deno.test("service: a degraded carrier is reported by name, but does not worsen the verdict", async () => {
  const { ctx } = mockCtx([page([
    { name: "Companion API V2", status: "operational", group: false, group_id: "c2q5" },
    { name: "FedEx", status: "degraded_performance", group: false, group_id: "carriers1" },
    { name: "UPS", status: "operational", group: false, group_id: "carriers1" },
  ])]);
  const result = await check.check!({}, ctx);
  assertEquals(result.state, "ok");
  assert(result.message?.includes("FedEx"), result.message);
});

Deno.test("service: unknown when the status page no longer names Companion API V2", async () => {
  const { ctx } = mockCtx([page([{ name: "ShipStation", status: "operational", group: false }])]);
  const result = await check.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("service: unknown (never down) when the status page itself errors", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await check.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("service: unknown on an unexpected (non-Statuspage) shape", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { unexpected: true } }]);
  const result = await check.check!({}, ctx);
  assertEquals(result.state, "unknown");
});
