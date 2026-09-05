import { assertEquals } from "@std/assert";
import chatMessagesGet from "../../actions/chat-messages-get.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("chat-messages-get: GETs the singular /chats/{id}/message path", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1 }]) }]);
  await chatMessagesGet.execute({ id: 43328, limit: 5, direction: "asc" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/chats/43328/message");
  assertEquals(queryOf(calls[0].url), { limit: "5", direction: "asc" });
});

Deno.test("chat-messages-get: the id path param is never leaked into the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await chatMessagesGet.execute({ id: 43328 }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
