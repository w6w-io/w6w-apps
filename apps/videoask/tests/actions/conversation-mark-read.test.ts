import { assertEquals } from "@std/assert";
import conversationMarkRead from "../../actions/conversation-mark-read.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("conversation-mark-read: PATCHes {read: true} by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { read: true } }]);
  await conversationMarkRead.execute({ contactId: "c1" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/conversations/c1/mark-read");
  assertEquals(JSON.parse(calls[0].body!), { read: true });
});

Deno.test("conversation-mark-read: read can be explicitly set to false", async () => {
  const { ctx, calls } = mockCtx([{ body: { read: false } }]);
  await conversationMarkRead.execute({ contactId: "c1", read: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { read: false });
});
