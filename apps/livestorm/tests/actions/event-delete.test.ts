import { assertEquals } from "@std/assert";
import eventDelete from "../../actions/event-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-delete: DELETEs /events/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const result = await eventDelete.execute({ id: "e1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/events/e1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { status: 204 });
});
