import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-event.ts";

Deno.test("delete-event: is an idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});

Deno.test("delete-event: DELETEs /events/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute({ eventId: 5 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/events/5");
  assertEquals(result, {});
});
