import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-sms.ts";

const okEnvelope = (data: unknown) => ({
  http_code: 200,
  response_code: "SUCCESS",
  response_msg: "Here are your data.",
  data,
});

Deno.test("send-sms: POSTs one message wrapped in a messages array", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: okEnvelope({
        total_price: 0.07,
        total_count: 1,
        queued_count: 1,
        messages: [{ message_id: "M1", to: "+61411111111", status: "SUCCESS", message_parts: 1 }],
      }),
    },
  ]);

  const result = await action.execute(
    { to: "+61411111111", body: "hi", from: "sender" },
    ctx,
  ) as { messageId: string; status: string; queuedCount: number };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://rest.clicksend.com/v3/sms/send");
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.messages.length, 1);
  assertEquals(sent.messages[0].to, "+61411111111");
  assertEquals(sent.messages[0].body, "hi");
  assertEquals(sent.messages[0].from, "sender");
  assertEquals(sent.messages[0].source, "w6w");

  assertEquals(result.messageId, "M1");
  assertEquals(result.status, "SUCCESS");
  assertEquals(result.queuedCount, 1);
});

Deno.test("send-sms: requires either `to` or `listId`", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ body: "hi" } as never, ctx),
    Error,
    "requires either",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-sms: sends listId instead of to when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope({ messages: [] }) }]);
  await action.execute({ listId: 428, body: "hi" } as never, ctx);
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.messages[0].list_id, 428);
  assertEquals(sent.messages[0].to, undefined);
});

Deno.test("send-sms: logs (but does not throw on) a per-recipient failure", async () => {
  const { ctx, logs } = mockCtx([
    {
      body: okEnvelope({
        total_count: 2,
        queued_count: 1,
        messages: [
          { message_id: "M1", to: "+1", status: "SUCCESS" },
          { message_id: "M2", to: "+2", status: "INVALID_RECIPIENT" },
        ],
      }),
    },
  ]);
  const result = await action.execute({ to: "+1", body: "hi" } as never, ctx) as {
    messages: unknown[];
  };
  assertEquals(result.messages.length, 2);
  assertEquals(logs.length, 1);
  assertEquals(logs[0].level, "warn");
});
