import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-ticket.ts";

Deno.test("delete-ticket: DELETEs /crm/v3/objects/tickets/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ id: "t1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/tickets/t1");
  assertEquals(out, { id: "t1", deleted: true });
});
