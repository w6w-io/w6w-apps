import { assertEquals } from "@std/assert";
import chatDelete from "../../actions/chat-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("chat-delete: DELETEs /v2/chats/{iden}", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await chatDelete.execute({ iden: "c1" }, ctx) as { deleted: boolean };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/chats/c1");
  assertEquals(out.deleted, true);
});

Deno.test("chat-delete: is declared idempotent", () => {
  assertEquals(chatDelete.idempotent, true);
});
