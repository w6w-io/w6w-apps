import { assertEquals } from "@std/assert";
import groupSendMessage from "../../actions/group-send-message.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-send-message: POSTs to /api/send-group-message with a normalised numbers list", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "QUEUED" } }]);
  await groupSendMessage.execute({
    fromNumber: "+1",
    numbers: "+2, +3",
    content: "hi all",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/send-group-message");
  assertEquals(jsonBodyOf(calls[0]), {
    from_number: "+1",
    numbers: ["+2", "+3"],
    content: "hi all",
  });
});
