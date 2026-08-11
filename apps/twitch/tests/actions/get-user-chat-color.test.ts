import { assertEquals, assertRejects } from "@std/assert";
import getUserChatColor from "../../actions/get-user-chat-color.ts";
import { mockCtx, pathOf, queryAll } from "../_helpers.ts";

Deno.test("get-user-chat-color: calls GET /helix/chat/color with repeated user_id keys", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ user_id: "11111", user_login: "foo", color: "#9146FF" }] },
  }]);
  const out = await getUserChatColor.execute({ userId: "11111, 22222" }, ctx) as {
    data: Array<{ color: string }>;
  };

  assertEquals(pathOf(calls[0].url), "/helix/chat/color");
  assertEquals(queryAll(calls[0].url, "user_id"), ["11111", "22222"]);
  assertEquals(out.data[0].color, "#9146FF");
});

/** An empty colour means "never picked one", and must not be normalised away. */
Deno.test("get-user-chat-color: an empty colour is passed through as an empty string", async () => {
  const { ctx } = mockCtx([{ body: { data: [{ user_id: "1", color: "" }] } }]);
  const out = await getUserChatColor.execute({ userId: "1" }, ctx) as {
    data: Array<{ color: string }>;
  };
  assertEquals(out.data[0].color, "");
});

Deno.test("get-user-chat-color: refuses an empty ID list without spending a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(getUserChatColor.execute({ userId: "  " }, ctx)),
    Error,
    "at least one user ID",
  );
  assertEquals(calls.length, 0);
});
