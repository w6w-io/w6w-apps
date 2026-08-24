import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-email.ts";

Deno.test("send-email: sends from.email_address_id (never a raw from address) and subject", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        http_code: 200,
        response_code: "SUCCESS",
        response_msg: "Transactional email queued for delivery.",
        data: {
          message_id: "E1",
          status: "WaitApproval",
          status_text: "Accepted for delivery",
          price: "0.0050",
          _currency: { currency_name_short: "USD" },
        },
      },
    },
  ]);

  const result = await action.execute(
    {
      to: [{ email: "test@clicksend.com", name: "John Doe" }],
      fromEmailAddressId: 1,
      fromName: "Joanne Doe",
      subject: "Test subject",
      body: "Lorem ipsum",
    } as never,
    ctx,
  ) as { messageId: string; status: string };

  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.from, { email_address_id: 1, name: "Joanne Doe" });
  assertEquals(sent.subject, "Test subject");
  assertEquals(sent.to, [{ email: "test@clicksend.com", name: "John Doe" }]);
  assertEquals(sent.cc, undefined);

  assertEquals(result.messageId, "E1");
  assertEquals(result.status, "WaitApproval");
});

Deno.test("send-email: maps attachments' contentId to the wire's content_id", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        http_code: 200,
        response_code: "SUCCESS",
        response_msg: "ok",
        data: { message_id: "E2", status: "Sent" },
      },
    },
  ]);

  await action.execute(
    {
      to: [{ email: "a@b.com" }],
      fromEmailAddressId: 1,
      subject: "s",
      body: "b",
      attachments: [
        {
          content: "ZmlsZSBjb250ZW50cw==",
          type: "text/plain",
          filename: "text.txt",
          disposition: "attachment",
          contentId: "text",
        },
      ],
    } as never,
    ctx,
  );

  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.attachments[0].content_id, "text");
  assertEquals(sent.attachments[0].contentId, undefined);
});
