import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-label.ts";

Deno.test("create-label: POSTs users/me/labels with default visibility", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "Label_1" } }]);
  await action.execute!({ name: "Follow-ups" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/gmail/v1/users/me/labels");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Follow-ups",
    labelListVisibility: "labelShow",
    messageListVisibility: "show",
  });
});
