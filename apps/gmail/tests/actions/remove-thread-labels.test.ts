import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/remove-thread-labels.ts";

Deno.test("remove-thread-labels: POSTs threads/{id}/modify with removeLabelIds", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await action.execute!({ threadId: "t1", labelIds: ["UNREAD"] }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/gmail/v1/users/me/threads/t1/modify");
  assertEquals(JSON.parse(calls[0].body!), { removeLabelIds: ["UNREAD"] });
});
