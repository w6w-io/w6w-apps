import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/message-create.ts";

Deno.test("message-create: POSTs /conversations/{id}/messages with channel and app", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: { id: "m1" } } }]);
  const out = await action.execute(
    { conversationId: "c1", channel: "email", app: "postmark" },
    ctx,
  );
  assertEquals(calls[0].url, "https://acme.api.kustomerapp.com/v1/conversations/c1/messages");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { channel: "email", app: "postmark" });
  assertEquals(out, { id: "m1" });
});

Deno.test("message-create: includes direction, preview and subject when set", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: {} } }]);
  await action.execute(
    {
      conversationId: "c1",
      channel: "chat",
      app: "kustomer-chat",
      direction: "in",
      preview: "Hi there",
      subject: "Hello",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    channel: "chat",
    app: "kustomer-chat",
    direction: "in",
    preview: "Hi there",
    subject: "Hello",
  });
});
