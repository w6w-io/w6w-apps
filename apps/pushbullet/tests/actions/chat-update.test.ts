import { assertEquals } from "@std/assert";
import chatUpdate from "../../actions/chat-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("chat-update: POSTs {muted} to /v2/chats/{iden}", async () => {
  const { ctx, calls } = mockCtx([{ body: { iden: "c1", muted: true } }]);
  const out = await chatUpdate.execute({ iden: "c1", muted: true }, ctx) as { muted: boolean };

  assertEquals(pathOf(calls[0].url), "/v2/chats/c1");
  assertEquals(JSON.parse(calls[0].body!), { muted: true });
  assertEquals(out.muted, true);
});

Deno.test("chat-update: is declared idempotent", () => {
  assertEquals(chatUpdate.idempotent, true);
});
