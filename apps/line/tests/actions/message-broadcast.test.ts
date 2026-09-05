import { assertEquals, assertRejects } from "@std/assert";
import messageBroadcast from "../../actions/message-broadcast.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const MESSAGES = [{ type: "text", text: "Hello, world1" }];

Deno.test("message-broadcast: POSTs messages with no to field", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await messageBroadcast.execute({ messages: MESSAGES }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/bot/message/broadcast");
  assertEquals(JSON.parse(calls[0].body!), { messages: MESSAGES });
});

Deno.test("message-broadcast: sends the retry key when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await messageBroadcast.execute(
    { messages: MESSAGES, retryKey: "123e4567-e89b-12d3-a456-426614174000" },
    ctx,
  );
  assertEquals(calls[0].headers["x-line-retry-key"], "123e4567-e89b-12d3-a456-426614174000");
});

Deno.test("message-broadcast: requires a non-empty messages array", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await messageBroadcast.execute({ messages: [] }, ctx),
    Error,
    "non-empty array",
  );
  assertEquals(calls.length, 0);
});

Deno.test("message-broadcast: is declared non-idempotent", () => {
  assertEquals(messageBroadcast.idempotent, false);
});
