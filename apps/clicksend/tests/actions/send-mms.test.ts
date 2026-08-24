import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-mms.ts";

const okEnvelope = (data: unknown) => ({
  http_code: 200,
  response_code: "SUCCESS",
  response_msg: "Messages queued for delivery.",
  data,
});

Deno.test("send-mms: sends media_file at the TOP LEVEL, not inside the message", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: okEnvelope({
        total_price: 2.42,
        total_count: 1,
        queued_count: 1,
        messages: [{ message_id: "M1", to: "+61298444214", status: "SUCCESS" }],
      }),
    },
  ]);

  await action.execute(
    {
      mediaFile: "http://yourdomain.com/tpLaX6A.gif",
      to: "+61298444214",
      subject: "Hi",
      body: "body text",
    } as never,
    ctx,
  );

  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.media_file, "http://yourdomain.com/tpLaX6A.gif");
  assertEquals(sent.messages[0].media_file, undefined);
  assertEquals(sent.messages[0].subject, "Hi");
});

Deno.test("send-mms: requires either `to` or `listId`", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute(
        { mediaFile: "http://x/y.gif", subject: "s", body: "b" } as never,
        ctx,
      ),
    Error,
    "requires either",
  );
  assertEquals(calls.length, 0);
});
