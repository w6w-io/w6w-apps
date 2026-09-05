import { assert, assertEquals, assertRejects } from "@std/assert";
import messageReply from "../../actions/message-reply.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const MESSAGES = [{ type: "text", text: "Hello, user" }];

Deno.test("message-reply: POSTs the reply token and messages", async () => {
  const { ctx, calls } = mockCtx([{ body: { sentMessages: [{ id: "1" }] } }]);
  const out = await messageReply.execute(
    { replyToken: "nHuyWiB7yP5Zw52FIkcQobQuGDXCTA", messages: MESSAGES },
    ctx,
  ) as { sentMessages: unknown[] };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/bot/message/reply");
  assertEquals(JSON.parse(calls[0].body!), {
    replyToken: "nHuyWiB7yP5Zw52FIkcQobQuGDXCTA",
    messages: MESSAGES,
  });
  assertEquals(out.sentMessages.length, 1);
});

Deno.test("message-reply: accepts messages as a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await messageReply.execute({ replyToken: "t", messages: JSON.stringify(MESSAGES) }, ctx);
  assertEquals(JSON.parse(calls[0].body!).messages, MESSAGES);
});

Deno.test("message-reply: notificationDisabled is omitted unless true", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await messageReply.execute({ replyToken: "t", messages: MESSAGES }, ctx);
  assert(!("notificationDisabled" in JSON.parse(calls[0].body!)));

  await messageReply.execute(
    { replyToken: "t", messages: MESSAGES, notificationDisabled: true },
    ctx,
  );
  assertEquals(JSON.parse(calls[1].body!).notificationDisabled, true);
});

Deno.test("message-reply: requires a replyToken", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await messageReply.execute({ replyToken: "", messages: MESSAGES }, ctx),
    Error,
    "replyToken",
  );
  assertEquals(calls.length, 0);
});

Deno.test("message-reply: requires a non-empty messages array", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await messageReply.execute({ replyToken: "t", messages: [] }, ctx),
    Error,
    "non-empty array",
  );
  assertEquals(calls.length, 0);
});

/** A used-up reply token cannot be retried — see the module doc. */
Deno.test("message-reply: is declared non-idempotent", () => {
  assertEquals(messageReply.idempotent, false);
});
