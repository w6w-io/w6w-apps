import { assertEquals } from "@std/assert";
import whatsappTemplateSend from "../../actions/whatsapp-template-send.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("whatsapp-template-send: POST .../whatsapp/messages/template, nests template", async () => {
  const { ctx, calls } = mockCtx([
    { body: { messageId: "wamid.1", conversationId: "c1", to: "14155552671" } },
  ]);
  const out = await whatsappTemplateSend.execute(
    {
      agentId: "a1",
      to: "14155552671",
      templateName: "order_confirmation",
      templateLanguage: "en_US",
      variables: '{"body": {"1": "ORD-123"}}',
    },
    ctx,
  ) as { messageId: string };

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/whatsapp/messages/template");
  assertEquals(JSON.parse(calls[0].body!), {
    to: "14155552671",
    template: {
      name: "order_confirmation",
      language: "en_US",
      variables: { body: { "1": "ORD-123" } },
    },
  });
  assertEquals(out.messageId, "wamid.1");
});

Deno.test("whatsapp-template-send: from and variables are optional", async () => {
  const { ctx, calls } = mockCtx([{ body: { messageId: null, conversationId: "c1", to: "1" } }]);
  await whatsappTemplateSend.execute({ agentId: "a1", to: "1", templateName: "hello" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { to: "1", template: { name: "hello" } });
});
