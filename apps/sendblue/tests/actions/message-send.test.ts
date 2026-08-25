import { assertEquals } from "@std/assert";
import messageSend from "../../actions/message-send.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("message-send: posts to the bare /api/send-message path", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "QUEUED", message_handle: "m1" } }]);
  const out = await messageSend.execute({
    fromNumber: "+19998887777",
    number: "+15551234567",
    content: "hi",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/send-message");
  assertEquals(jsonBodyOf(calls[0]), {
    from_number: "+19998887777",
    number: "+15551234567",
    content: "hi",
  });
  assertEquals(out.message_handle, "m1");
});

Deno.test("message-send: parses replyTo/appCard JSON strings and omits unset fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "QUEUED" } }]);
  await messageSend.execute({
    fromNumber: "+1",
    number: "+2",
    replyTo: '{"message_handle":"parent"}',
    appCard: '{"appName":"App"}',
  }, ctx);

  assertEquals(jsonBodyOf(calls[0]), {
    from_number: "+1",
    number: "+2",
    reply_to: { message_handle: "parent" },
    app_card: { appName: "App" },
  });
});
