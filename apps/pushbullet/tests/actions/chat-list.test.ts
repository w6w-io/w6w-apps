import { assertEquals } from "@std/assert";
import chatList from "../../actions/chat-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("chat-list: GETs /v2/chats", async () => {
  const { ctx, calls } = mockCtx([{ body: { chats: [{ iden: "c1" }] } }]);
  const out = await chatList.execute({}, ctx) as { chats: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/chats");
  assertEquals(out.chats.length, 1);
});
