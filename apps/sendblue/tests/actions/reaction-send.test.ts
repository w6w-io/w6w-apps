import { assertEquals } from "@std/assert";
import reactionSend from "../../actions/reaction-send.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("reaction-send: POSTs the raw reaction value verbatim, including a - removal prefix", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", reaction: "-🔥" } }]);
  await reactionSend.execute({
    fromNumber: "+1",
    messageHandle: "m1",
    reaction: "-🔥",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/send-reaction");
  assertEquals(jsonBodyOf(calls[0]), {
    from_number: "+1",
    message_handle: "m1",
    reaction: "-🔥",
  });
});
