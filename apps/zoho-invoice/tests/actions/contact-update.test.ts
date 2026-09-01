import { assertEquals } from "@std/assert";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

Deno.test("contact-update: PUTs the fields to /contacts/{id}", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "success", contact: { contact_id: "42" } } },
  ]);
  await action.execute({ recordId: "42", fields: { company_name: "Acme LLC" } }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/invoice/v3/contacts/42");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { company_name: "Acme LLC" });
});
