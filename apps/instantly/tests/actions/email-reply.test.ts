import { assertEquals } from "@std/assert";
import emailReply from "../../actions/email-reply.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("email-reply: POSTs /emails/reply with reply_to_uuid (not reyply_to_uuid)", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e2" } }]);
  const out = await emailReply.execute(
    { eaccount: "a@b.com", reply_to_uuid: "e1", subject: "Re: Hi", html: "Hello<br/>" },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/emails/reply");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.reply_to_uuid, "e1");
  assertEquals("reyply_to_uuid" in body, false);
  assertEquals(body.body.html, "Hello<br/>");
  assertEquals(out.id, "e2");
});

Deno.test("email-reply: additional_recipients accepts a comma string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await emailReply.execute(
    {
      eaccount: "a@b.com",
      reply_to_uuid: "e1",
      subject: "Re: Hi",
      additional_recipients: "x@y.com,z@y.com",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).additional_recipients, ["x@y.com", "z@y.com"]);
});

Deno.test("email-reply: is declared non-idempotent", () => {
  assertEquals(emailReply.idempotent, false);
});
