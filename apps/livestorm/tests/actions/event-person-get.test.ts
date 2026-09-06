import { assertEquals } from "@std/assert";
import eventPersonGet from "../../actions/event-person-get.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("event-person-get: GETs /events/{eventId}/people/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: single("people", "p1") }]);
  const result = await eventPersonGet.execute({ eventId: "e1", id: "p1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/events/e1/people/p1");
  assertEquals(result, { id: "p1", type: "people", attributes: {} });
});
