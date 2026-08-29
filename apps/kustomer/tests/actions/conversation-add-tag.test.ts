import { assertEquals } from "@std/assert";
import { mockKustomerCtx } from "../_helpers.ts";
import action from "../../actions/conversation-add-tag.ts";

Deno.test("conversation-add-tag: POSTs a bare array of tag names", async () => {
  const { ctx, calls } = mockKustomerCtx([{ body: { data: { id: "c1" } } }]);
  await action.execute({ id: "c1", tags: "vip, urgent" }, ctx);
  assertEquals(calls[0].url, "https://acme.api.kustomerapp.com/v1/conversations/c1/tags");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), ["vip", "urgent"]);
});
