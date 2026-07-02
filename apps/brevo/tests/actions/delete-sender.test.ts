import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-sender.ts";

Deno.test("delete-sender: DELETEs /v3/senders/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ senderId: "42" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/senders/42");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { success: true });
});
