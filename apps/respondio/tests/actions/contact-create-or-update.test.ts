import { assertEquals } from "@std/assert";
import contactCreateOrUpdate from "../../actions/contact-create-or-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create-or-update: POSTs /contact/create_or_update/{identifier}", async () => {
  const { ctx, calls } = mockCtx([{ body: { contactId: 5 } }]);
  const out = await contactCreateOrUpdate.execute(
    { identifier: "email:ada@example.com", firstName: "Ada" },
    ctx,
  ) as { contactId: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/contact/create_or_update/email:ada@example.com");
  assertEquals(JSON.parse(calls[0].body!), { firstName: "Ada" });
  assertEquals(out.contactId, 5);
});

Deno.test("contact-create-or-update: allows an id: identifier, unlike a bare create", async () => {
  const { ctx, calls } = mockCtx([{ body: { contactId: 1 } }]);
  await contactCreateOrUpdate.execute({ identifier: "id:1", firstName: "Ada" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/contact/create_or_update/id:1");
});

Deno.test("contact-create-or-update: is declared idempotent — an upsert is safe to retry", () => {
  assertEquals(contactCreateOrUpdate.idempotent, true);
});
