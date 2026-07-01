import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/untrash-thread.ts";

Deno.test("untrash-thread: POSTs users/me/threads/{id}/untrash", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await action.execute!({ threadId: "t1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/gmail/v1/users/me/threads/t1/untrash");
});
