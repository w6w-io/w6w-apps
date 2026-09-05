import { assert, assertEquals, assertRejects } from "@std/assert";
import messagePush from "../../actions/message-push.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const MESSAGES = [{ type: "text", text: "Hello, world1" }];

Deno.test("message-push: POSTs to and messages", async () => {
  const { ctx, calls } = mockCtx([{ body: { sentMessages: [{ id: "1" }] } }]);
  await messagePush.execute({ to: "U4af4980629...", messages: MESSAGES }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/bot/message/push");
  assertEquals(JSON.parse(calls[0].body!), { to: "U4af4980629...", messages: MESSAGES });
});

Deno.test("message-push: sends the retry key as X-Line-Retry-Key when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await messagePush.execute(
    { to: "U1", messages: MESSAGES, retryKey: "123e4567-e89b-12d3-a456-426614174000" },
    ctx,
  );
  assertEquals(calls[0].headers["x-line-retry-key"], "123e4567-e89b-12d3-a456-426614174000");
});

Deno.test("message-push: no X-Line-Retry-Key header when retryKey is omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await messagePush.execute({ to: "U1", messages: MESSAGES }, ctx);
  assert(!("x-line-retry-key" in calls[0].headers));
});

Deno.test("message-push: requires to", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await messagePush.execute({ to: "", messages: MESSAGES }, ctx),
    Error,
    "to",
  );
  assertEquals(calls.length, 0);
});

Deno.test("message-push: requires a non-empty messages array", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await messagePush.execute({ to: "U1", messages: [] }, ctx),
    Error,
    "non-empty array",
  );
  assertEquals(calls.length, 0);
});

/** No caller-supplied retry key means a retry re-sends — see the module doc. */
Deno.test("message-push: is declared non-idempotent", () => {
  assertEquals(messagePush.idempotent, false);
});
