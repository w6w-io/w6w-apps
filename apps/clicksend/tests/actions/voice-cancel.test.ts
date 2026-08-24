import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/voice-cancel.ts";

Deno.test("voice-cancel: PUTs to /voice/{message_id}/cancel", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        http_code: 200,
        response_code: "SUCCESS",
        response_msg: "Voice have been cancelled.",
        data: [],
      },
    },
  ]);
  const result = await action.execute({ messageId: "V1" }, ctx) as { message: string };
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://rest.clicksend.com/v3/voice/V1/cancel");
  assertEquals(result.message.includes("cancelled"), true);
});
