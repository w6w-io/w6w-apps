import { assertEquals } from "@std/assert";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: POSTs the fields as the body, not wrapped", async () => {
  const { ctx, calls } = mockBooksCtx([
    { body: { code: 0, message: "success", contact: { contact_id: "1" } } },
  ]);
  await action.execute({ fields: { contact_name: "Acme Inc", contact_type: "customer" } }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/books/v3/contacts");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { contact_name: "Acme Inc", contact_type: "customer" });
});
