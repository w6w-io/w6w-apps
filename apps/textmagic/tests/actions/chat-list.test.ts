import { assertEquals } from "@std/assert";
import chatList from "../../actions/chat-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("chat-list: GETs /chats with the status filter", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 43328 }]) }]);
  await chatList.execute({ status: "a", limit: 20 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/chats");
  assertEquals(queryOf(calls[0].url), { status: "a", limit: "20" });
});
