import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-draft.ts";

Deno.test("send-draft: POSTs users/me/drafts/send with { id }", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sent" } }]);
  await action.execute!({ draftId: "d1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/gmail/v1/users/me/drafts/send");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { id: "d1" });
});
