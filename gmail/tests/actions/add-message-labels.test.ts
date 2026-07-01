import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-message-labels.ts";

Deno.test("add-message-labels: POSTs modify with addLabelIds", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute!({ messageId: "m1", labelIds: ["INBOX", "STARRED"] }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/gmail/v1/users/me/messages/m1/modify");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { addLabelIds: ["INBOX", "STARRED"] });
});
