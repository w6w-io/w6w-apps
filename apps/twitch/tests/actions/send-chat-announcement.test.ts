import { assertEquals, assertRejects } from "@std/assert";
import sendChatAnnouncement from "../../actions/send-chat-announcement.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

/** The two ids are QUERY parameters; the message and colour are in the BODY. */
Deno.test("send-chat-announcement: POSTs ids in the query and the message in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await sendChatAnnouncement.execute(
    { broadcasterId: "11111", moderatorId: "44444", message: "hello", color: "purple" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/helix/chat/announcements");
  assertEquals(queryOf(calls[0].url), { broadcaster_id: "11111", moderator_id: "44444" });
  assertEquals(JSON.parse(calls[0].body!), { message: "hello", color: "purple" });
  assertEquals(out, { status: 204 });
});

/**
 * Twitch TRUNCATES a message over 500 characters instead of rejecting it, so a
 * silently halved announcement would look like a success. Refusing locally is
 * the whole point.
 */
Deno.test("send-chat-announcement: refuses an over-long message rather than letting Twitch truncate it", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(sendChatAnnouncement.execute(
        { broadcasterId: "1", moderatorId: "2", message: "x".repeat(501) },
        ctx,
      )),
    Error,
    "500",
  );
  assertEquals(calls.length, 0, "sent a message Twitch would have silently truncated");
});

Deno.test("send-chat-announcement: refuses an empty message", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(sendChatAnnouncement.execute(
        { broadcasterId: "1", moderatorId: "2", message: "   " },
        ctx,
      )),
    Error,
    "non-empty",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-chat-announcement: omits colour when unset, and is not idempotent", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await sendChatAnnouncement.execute(
    { broadcasterId: "1", moderatorId: "2", message: "hi" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { message: "hi" });
  assertEquals(sendChatAnnouncement.idempotent, false);
});
