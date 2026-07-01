import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-update.ts";

Deno.test("message-update: POSTs /chat.update with { channel, ts, text }", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({ channel: "C1", ts: "1.1", text: "edited" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/chat.update");
  assertEquals(JSON.parse(calls[0].body!), { channel: "C1", ts: "1.1", text: "edited" });
});
