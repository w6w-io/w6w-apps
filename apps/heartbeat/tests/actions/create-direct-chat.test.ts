import { assertEquals } from "@std/assert";
import createDirectChat from "../../actions/create-direct-chat.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-direct-chat: PUT /directChats returns {chatID, url}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { chatID: "dc1", url: "https://app.heartbeat.chat/x/c/dc1" },
  }]);
  const out = await createDirectChat.execute({ userID1: "u1", userID2: "u2" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v0/directChats");
  assertEquals(out.chatID, "dc1");
});

Deno.test("create-direct-chat: is idempotent — Heartbeat documents get-or-create", () => {
  assertEquals(createDirectChat.idempotent, true);
});
