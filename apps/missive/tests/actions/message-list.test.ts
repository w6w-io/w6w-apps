import { assertEquals } from "@std/assert";
import action from "../../actions/message-list.ts";
import { assertActionRejects, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("message-list: finds messages by email Message-ID", async () => {
  const { ctx, calls } = mockCtx([{ body: { messages: [{ id: "m1" }] } }]);
  const out = await action.execute({ emailMessageId: "<abc@x.com>" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/messages");
  assertEquals(queryOf(calls[0].url), { email_message_id: "<abc@x.com>" });
  assertEquals(out, [{ id: "m1" }]);
});

Deno.test("message-list: requires emailMessageId", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ emailMessageId: "" }, ctx));
});
