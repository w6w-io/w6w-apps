import { assertEquals } from "@std/assert";
import eventDelete from "../../actions/event-delete.ts";
import { asMutation, mockCtx, pathOf, writeResult } from "../_helpers.ts";

Deno.test("event-delete: metadata — idempotent", () => {
  assertEquals(eventDelete.type, "perform");
  assertEquals(eventDelete.idempotent, true);
});

Deno.test("event-delete: DELETE /events/{eventId}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: writeResult("Successfully deleted", "e1"),
  }]);
  const result = asMutation(await eventDelete.execute({ eventId: "e1" }, ctx));
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/events/e1");
  assertEquals(result.info, "Successfully deleted");
});
