import { assertEquals, assertRejects } from "@std/assert";
import monitorGet from "../../actions/monitor-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("monitor-get: calls GET /api/v1/monitor/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 666486743, overall_state: "OK" } }]);
  const out = await monitorGet.execute({ monitorId: 666486743 }, ctx) as {
    overall_state: string;
  };

  assertEquals(pathOf(calls[0].url), "/api/v1/monitor/666486743");
  assertEquals(out.overall_state, "OK");
});

Deno.test("monitor-get: a numeric string from a form is accepted", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await monitorGet.execute({ monitorId: " 42 " }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/monitor/42");
});

/**
 * Datadog types the id `int64`. Rejecting a non-integer here produces a message
 * that names the field, instead of a 400 that reads like a server fault.
 */
Deno.test("monitor-get: a non-integer id is refused before anything is sent", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(monitorGet.execute({ monitorId: "abc" }, ctx)),
    Error,
    "Monitor ID must be a whole number",
  );
  assertEquals(calls.length, 0);
});

Deno.test("monitor-get: group states and downtimes are optional query parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await monitorGet.execute({ monitorId: 1, groupStates: "all", withDowntimes: true }, ctx);
  assertEquals(queryOf(calls[0].url), { group_states: "all", with_downtimes: "true" });
});
