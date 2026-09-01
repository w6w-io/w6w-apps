import { assertEquals } from "@std/assert";
import { mockFreshsalesCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

Deno.test("contact-get: GETs /contacts/:id and unwraps the `contact` key", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { contact: { id: 7, first_name: "James" } } }]);
  const out = await action.execute({ contactId: 7 }, ctx);
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/contacts/7");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: 7, first_name: "James" });
});

Deno.test("contact-get: joins include into a comma-separated query param", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { contact: {} } }]);
  await action.execute({ contactId: 7, include: ["owner", "sales_accounts"] }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.myfreshworks.com/crm/sales/api/contacts/7?include=owner%2Csales_accounts",
  );
});

Deno.test("contact-get: omits include when empty", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { contact: {} } }]);
  await action.execute({ contactId: 7, include: [] }, ctx);
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/contacts/7");
});
