import { assertEquals } from "@std/assert";
import { mockFreshsalesCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: POSTs to /contacts, wrapped and unwrapped under `contact`", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { contact: { id: 1, first_name: "James" } } }]);
  const out = await action.execute({ firstName: "James", email: "j@example.com" }, ctx);
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/contacts");
  assertEquals(calls[0].method, "POST");
  assertEquals(
    JSON.parse(calls[0].body!),
    { contact: { first_name: "James", email: "j@example.com" } },
  );
  assertEquals(out, { id: 1, first_name: "James" });
});

Deno.test("contact-create: drops unset optional fields rather than sending nulls", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { contact: {} } }]);
  await action.execute({ firstName: "James" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { contact: { first_name: "James" } });
});

Deno.test("contact-create: parses the customField JSON param", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { contact: {} } }]);
  await action.execute({ firstName: "James", customField: '{"cf_is_active":true}' }, ctx);
  assertEquals(
    JSON.parse(calls[0].body!),
    { contact: { first_name: "James", custom_field: { cf_is_active: true } } },
  );
});
