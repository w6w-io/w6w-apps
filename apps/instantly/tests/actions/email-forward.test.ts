import { assertEquals } from "@std/assert";
import emailForward from "../../actions/email-forward.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("email-forward: POSTs /emails/forward", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e2" } }]);
  const out = await emailForward.execute(
    {
      eaccount: "a@b.com",
      reply_to_uuid: "e1",
      to_address_email_list: "x@y.com",
      subject: "Fwd: Hi",
      include_original_body: true,
    },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/emails/forward");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.to_address_email_list, "x@y.com");
  assertEquals(body.include_original_body, true);
  assertEquals(out.id, "e2");
});

Deno.test("email-forward: is declared non-idempotent", () => {
  assertEquals(emailForward.idempotent, false);
});
