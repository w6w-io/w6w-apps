import { assertEquals } from "@std/assert";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

Deno.test("contact-update: PUTs /contacts/{id} with the changed fields", async () => {
  const { ctx, calls } = mockBooksCtx([
    { body: { code: 0, message: "success", contact: { contact_id: "42" } } },
  ]);
  await action.execute({ recordId: "42", fields: { phone: "+1 555 0100" } }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/books/v3/contacts/42");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { phone: "+1 555 0100" });
});
