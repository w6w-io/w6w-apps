import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sms-cancel.ts";

Deno.test("sms-cancel: PUTs to /sms/{message_id}/cancel and returns the confirmation message", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        http_code: 200,
        response_code: "SUCCESS",
        response_msg: "Message 307EF035-B7CE-4321-93CD-0753597B7293 has been cancelled.",
        data: [],
      },
    },
  ]);

  const result = await action.execute(
    { messageId: "307EF035-B7CE-4321-93CD-0753597B7293" },
    ctx,
  ) as { message: string };
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    calls[0].url,
    "https://rest.clicksend.com/v3/sms/307EF035-B7CE-4321-93CD-0753597B7293/cancel",
  );
  assertEquals(result.message.includes("has been cancelled"), true);
});

Deno.test("sms-cancel: URL-encodes the message id", async () => {
  const { ctx, calls } = mockCtx([
    { body: { http_code: 200, response_code: "SUCCESS", response_msg: "ok", data: [] } },
  ]);
  await action.execute({ messageId: "a b/c" }, ctx);
  assertEquals(calls[0].url, "https://rest.clicksend.com/v3/sms/a%20b%2Fc/cancel");
});
