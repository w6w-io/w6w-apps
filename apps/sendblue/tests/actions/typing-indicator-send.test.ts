import { assertEquals } from "@std/assert";
import typingIndicatorSend from "../../actions/typing-indicator-send.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("typing-indicator-send: POSTs to /api/send-typing-indicator", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "SENT", number: "+2" } }]);
  await typingIndicatorSend.execute({ fromNumber: "+1", number: "+2", state: "start" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/send-typing-indicator");
  assertEquals(jsonBodyOf(calls[0]), { from_number: "+1", number: "+2", state: "start" });
});
