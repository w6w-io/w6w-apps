import { assertEquals } from "@std/assert";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/invoice-email.ts";

Deno.test("invoice-email: POSTs /invoices/{id}/email with the mail fields, splitting comma lists", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "Your invoice has been emailed to the customer(s)." } },
  ]);
  await action.execute({
    recordId: "77",
    toMailIds: "a@example.com, b@example.com",
    ccMailIds: "c@example.com",
    subject: "Your invoice",
    body: "Please find attached.",
  }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/invoice/v3/invoices/77/email");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    to_mail_ids: ["a@example.com", "b@example.com"],
    cc_mail_ids: ["c@example.com"],
    subject: "Your invoice",
    body: "Please find attached.",
  });
});

Deno.test("invoice-email: omits cc when not given, rather than sending an empty array", async () => {
  const { ctx, calls } = mockInvoiceCtx([{ body: { code: 0, message: "ok" } }]);
  await action.execute({ recordId: "77", toMailIds: "a@example.com" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.cc_mail_ids, undefined);
});
