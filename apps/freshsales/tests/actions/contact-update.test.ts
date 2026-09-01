import { assertEquals } from "@std/assert";
import { mockFreshsalesCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

Deno.test("contact-update: PUTs to /contacts/:id with only the set fields", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { contact: { id: 1 } } }]);
  const out = await action.execute({ contactId: 1, mobileNumber: "5-000-000" }, ctx);
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/contacts/1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { contact: { mobile_number: "5-000-000" } });
  assertEquals(out, { id: 1 });
});

Deno.test("contact-update: an empty string field is treated as unset, not a blank value", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { contact: {} } }]);
  await action.execute({ contactId: 1, email: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { contact: {} });
});
