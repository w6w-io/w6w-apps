import { assertEquals } from "@std/assert";
import conversationMarkAsOpen from "../../actions/conversation-mark-as-open.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("conversation-mark-as-open: POSTs the mark-as-open path and returns the bare object", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "CN1" } }]);
  const out = await conversationMarkAsOpen.execute({ conversationId: "CN1" }, ctx) as {
    id: string;
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/conversations/CN1/mark-as-open");
  assertEquals(out.id, "CN1");
});

Deno.test("conversation-mark-as-open: is an idempotent perform action", () => {
  assertEquals(conversationMarkAsOpen.type, "perform");
  assertEquals(conversationMarkAsOpen.idempotent, true);
});
