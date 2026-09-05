import { assertEquals } from "@std/assert";
import eventList from "../../actions/event-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("event-list: hits /api/v1/events", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 123123, name: "Concert for a Cure" }] }]);
  const out = await eventList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/events");
  assertEquals((out as { data: unknown[] }).data.length, 1);
});

Deno.test("event-list: passes only the generic pagination/order params", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await eventList.execute({ page: 2, per_page: 10, order: "asc" }, ctx);
  assertEquals(queryOf(calls[0].url), { page: "2", per_page: "10", order: "asc" });
});
