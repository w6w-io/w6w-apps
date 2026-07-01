import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-delete.ts";

Deno.test("message-delete: POSTs /chat.delete with { channel, ts }", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({ channel: "C1", ts: "1.1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/chat.delete");
  assertEquals(JSON.parse(calls[0].body!), { channel: "C1", ts: "1.1" });
});
