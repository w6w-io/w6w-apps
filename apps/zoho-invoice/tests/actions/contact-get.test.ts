import { assertEquals } from "@std/assert";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

Deno.test("contact-get: GETs /contacts/{id} and unwraps the singular key", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "success", contact: { contact_id: "42" } } },
  ]);
  const out = await action.execute({ recordId: "42" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/invoice/v3/contacts/42");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { contact_id: "42" });
});

Deno.test("contact-get: an explicit organizationId overrides the connection default", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "success", contact: {} } },
  ]);
  await action.execute({ recordId: "1", organizationId: "999" }, ctx);
  assertEquals(calls[0].headers["x-com-zoho-invoice-organizationid"], "999");
});
