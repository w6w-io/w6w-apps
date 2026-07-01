import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/mark-message-unread.ts";

Deno.test("mark-message-unread: adds UNREAD label via modify", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute!({ messageId: "m1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/gmail/v1/users/me/messages/m1/modify");
  assertEquals(JSON.parse(calls[0].body!), { addLabelIds: ["UNREAD"] });
});
