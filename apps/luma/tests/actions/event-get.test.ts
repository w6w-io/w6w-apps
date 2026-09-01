import { assertEquals } from "@std/assert";
import eventGet from "../../actions/event-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("event-get: calls GET /v1/events/get?event_id=", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "evt-1", name: "Launch Party" } }]);
  const out = await eventGet.execute({ eventId: "evt-1" }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/v1/events/get");
  assertEquals(queryOf(calls[0].url), { event_id: "evt-1" });
  assertEquals(out.name, "Launch Party");
});
