import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-messages-send.ts";

const conn = { display: { baseUrl: "https://live-mt-server.wati.io/12345" } };

Deno.test("template-messages-send: POSTs /messageTemplates/send", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { success: true, broadcast_id: "b1", recipients: [] } }],
    conn,
  );
  const recipients = [{ phone_number: "1234567890", local_message_id: "local-1" }];
  const out = await action.execute(
    {
      templateName: "welcome_template",
      broadcastName: "Welcome Campaign",
      recipients,
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://live-mt-server.wati.io/12345/api/ext/v3/messageTemplates/send",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    template_name: "welcome_template",
    broadcast_name: "Welcome Campaign",
    recipients,
  });
  assertEquals(out, { success: true, broadcast_id: "b1", recipients: [] });
});

Deno.test("template-messages-send: accepts `recipients` as a JSON string, and includes channel when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true } }], conn);
  await action.execute(
    {
      channel: "1234567890",
      templateName: "welcome_template",
      broadcastName: "Welcome Campaign",
      recipients: '[{"phone_number":"1234567890"}]',
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    channel: "1234567890",
    template_name: "welcome_template",
    broadcast_name: "Welcome Campaign",
    recipients: [{ phone_number: "1234567890" }],
  });
});

Deno.test("template-messages-send: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
