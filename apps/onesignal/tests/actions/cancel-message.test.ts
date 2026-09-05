import { assertEquals } from "@std/assert";
import cancelMessage from "../../actions/cancel-message.ts";
import { mockCtxWithConnection, pathOf } from "../_helpers.ts";

Deno.test("cancel-message: DELETEs and returns the vendor's success body", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ status: 200, body: { success: true } }]);
  const out = await cancelMessage.execute({ messageId: "msg-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/notifications/msg-1");
  assertEquals(out, { success: true });
});
