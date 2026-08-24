import { assertEquals } from "@std/assert";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

Deno.test("contact-get: GETs /contacts/{id}", async () => {
  const { ctx, calls } = mockBooksCtx([
    { body: { code: 0, message: "success", contact: { contact_id: "42", contact_name: "Acme" } } },
  ]);
  const out = await action.execute({ recordId: "42" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/books/v3/contacts/42");
  assertEquals(url.searchParams.get("organization_id"), "10234695");
  assertEquals(out, { contact_id: "42", contact_name: "Acme" });
});
