import { assertEquals } from "@std/assert";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/invoice-email.ts";

Deno.test("invoice-email: POSTs /invoices/{id}/email with parsed recipient lists", async () => {
  const { ctx, calls } = mockBooksCtx([{ body: { code: 0, message: "mail sent" } }]);
  await action.execute(
    {
      recordId: "1",
      toMailIds: "a@acme.com, b@acme.com",
      ccMailIds: "c@acme.com",
      subject: "Invoice",
      body: "Please pay",
    },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/books/v3/invoices/1/email");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    to_mail_ids: ["a@acme.com", "b@acme.com"],
    cc_mail_ids: ["c@acme.com"],
    subject: "Invoice",
    body: "Please pay",
  });
});

Deno.test("invoice-email: omits cc/subject/body when unset so Zoho's default mail content applies", async () => {
  const { ctx, calls } = mockBooksCtx([{ body: { code: 0, message: "mail sent" } }]);
  await action.execute({ recordId: "1", toMailIds: "a@acme.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { to_mail_ids: ["a@acme.com"] });
});
