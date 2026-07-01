import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-thread.ts";

Deno.test("get-thread: GETs users/me/threads/{id} with format=full by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await action.execute!({ threadId: "t1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/gmail/v1/users/me/threads/t1");
  assertEquals(url.searchParams.get("format"), "full");
});
