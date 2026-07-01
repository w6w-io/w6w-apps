import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/remove-message-labels.ts";

Deno.test("remove-message-labels: POSTs modify with removeLabelIds", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute!({ messageId: "m1", labelIds: ["UNREAD"] }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/gmail/v1/users/me/messages/m1/modify");
  assertEquals(JSON.parse(calls[0].body!), { removeLabelIds: ["UNREAD"] });
});
