import { assertEquals } from "@std/assert";
import listEvents from "../../actions/list-events.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-events: GET /events?groupID=, wrapped under `events`", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "e1" }] }]);
  const out = await listEvents.execute({ groupID: "g1" }, ctx) as { events: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v0/events");
  assertEquals(queryOf(calls[0].url), { groupID: "g1" });
  assertEquals(out.events.length, 1);
});

Deno.test("list-events: groupID is optional — omitted from the query when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listEvents.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
