import { assertEquals } from "@std/assert";
import action from "../../actions/message-create.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("message-create: posts account and channel fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { messages: { id: "m1" } } }]);
  const out = await action.execute(
    {
      account: "acct-1",
      body: "hi",
      fromField: '{"id":"12345","username":"@phil","name":"Phil"}',
      externalId: "ext-1",
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/messages");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.messages.account, "acct-1");
  assertEquals(body.messages.external_id, "ext-1");
  assertEquals(body.messages.from_field, { id: "12345", username: "@phil", name: "Phil" });
  assertEquals(out, { messages: { id: "m1" } });
});

Deno.test("message-create: requires account", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ account: "" }, ctx));
});
