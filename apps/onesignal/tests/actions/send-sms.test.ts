import { assertEquals } from "@std/assert";
import sendSms from "../../actions/send-sms.ts";
import { mockCtxWithInvocation } from "../_helpers.ts";

Deno.test("send-sms: always sends target_channel sms, and contents as a locale map", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ status: 200, body: { id: "msg-1" } }]);
  await sendSms.execute(
    { contents: "Your code is 1234", includePhoneNumbers: "+15551234567" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.target_channel, "sms");
  assertEquals(body.contents, { en: "Your code is 1234" });
  assertEquals(body.include_phone_numbers, ["+15551234567"]);
});
