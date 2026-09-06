import { assertEquals } from "@std/assert";
import sessionChatMessagesList from "../../actions/session-chat-messages-list.ts";
import type { JsonApiListResponse } from "../../lib/client.ts";
import { list, mockCtx, pathOf, resource } from "../_helpers.ts";

Deno.test("session-chat-messages-list: GETs /sessions/{id}/chat_messages", async () => {
  const { ctx, calls } = mockCtx([{ body: list([resource("chat_messages", "m1")]) }]);
  const result = await sessionChatMessagesList.execute({ id: "s1" }, ctx) as JsonApiListResponse;

  assertEquals(pathOf(calls[0].url), "/v1/sessions/s1/chat_messages");
  assertEquals(result.data.length, 1);
});
