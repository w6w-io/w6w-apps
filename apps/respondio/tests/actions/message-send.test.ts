import { assertEquals, assertRejects } from "@std/assert";
import messageSend from "../../actions/message-send.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("message-send: builds a text message", async () => {
  const { ctx, calls } = mockCtx([{ body: { messageId: 1 } }]);
  const out = await messageSend.execute(
    { identifier: "id:1", messageType: "text", text: "Hello!" },
    ctx,
  ) as { messageId: number };

  assertEquals(pathOf(calls[0].url), "/v2/contact/id:1/message");
  assertEquals(JSON.parse(calls[0].body!), { message: { type: "text", text: "Hello!" } });
  assertEquals(out.messageId, 1);
});

Deno.test("message-send: a text message carries an optional Facebook message tag", async () => {
  const { ctx, calls } = mockCtx([{ body: { messageId: 1 } }]);
  await messageSend.execute(
    { identifier: "id:1", messageType: "text", text: "Hi", messageTag: "ACCOUNT_UPDATE" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).message, {
    type: "text",
    text: "Hi",
    messageTag: "ACCOUNT_UPDATE",
  });
});

Deno.test("message-send: builds an attachment message", async () => {
  const { ctx, calls } = mockCtx([{ body: { messageId: 1 } }]);
  await messageSend.execute(
    {
      identifier: "id:1",
      messageType: "attachment",
      attachmentType: "image",
      attachmentUrl: "https://example.com/x.jpg",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).message, {
    type: "attachment",
    attachment: { type: "image", url: "https://example.com/x.jpg" },
  });
});

Deno.test("message-send: an attachment without a URL is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await messageSend.execute(
        { identifier: "id:1", messageType: "attachment", attachmentType: "image" },
        ctx,
      ),
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("message-send: builds an email message with cc/bcc arrays", async () => {
  const { ctx, calls } = mockCtx([{ body: { messageId: 1 } }]);
  await messageSend.execute(
    {
      identifier: "id:1",
      messageType: "email",
      text: "Body",
      emailSubject: "Subject",
      emailCc: ["a@example.com"],
      emailBcc: ["b@example.com", "c@example.com"],
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).message, {
    type: "email",
    text: "Body",
    subject: "Subject",
    cc: ["a@example.com"],
    bcc: ["b@example.com", "c@example.com"],
  });
});

Deno.test("message-send: builds a quick_reply message", async () => {
  const { ctx, calls } = mockCtx([{ body: { messageId: 1 } }]);
  await messageSend.execute(
    {
      identifier: "id:1",
      messageType: "quick_reply",
      quickReplyTitle: "Pick one",
      quickReplyReplies: ["Yes", "No"],
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).message, {
    type: "quick_reply",
    title: "Pick one",
    replies: ["Yes", "No"],
  });
});

Deno.test("message-send: builds a custom_payload message from a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: { messageId: 1 } }]);
  await messageSend.execute(
    { identifier: "id:1", messageType: "custom_payload", customPayload: '{"foo":"bar"}' },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).message, {
    type: "custom_payload",
    payload: { foo: "bar" },
  });
});

Deno.test("message-send: an invalid JSON payload is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await messageSend.execute(
        { identifier: "id:1", messageType: "custom_payload", customPayload: "{not json" },
        ctx,
      ),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("message-send: builds a whatsapp_template message and passes channelId through", async () => {
  const { ctx, calls } = mockCtx([{ body: { messageId: 1 } }]);
  await messageSend.execute(
    {
      identifier: "id:1",
      channelId: 12345,
      messageType: "whatsapp_template",
      templateName: "order_confirmation",
      templateLanguageCode: "en",
      templateComponents: [{ type: "body", text: "Hi {{1}}", parameters: [] }],
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.channelId, 12345);
  assertEquals(body.message.type, "whatsapp_template");
  assertEquals(body.message.template.name, "order_confirmation");
  assertEquals(body.message.template.languageCode, "en");
  assertEquals(body.message.template.components, [
    { type: "body", text: "Hi {{1}}", parameters: [] },
  ]);
});

Deno.test("message-send: is never idempotent", () => {
  assertEquals(messageSend.idempotent, false);
});
