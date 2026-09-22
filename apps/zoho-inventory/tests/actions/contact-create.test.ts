import { assertEquals, assertRejects } from "@std/assert";
import { mockInventoryCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: POSTs /contacts with the documented body", async () => {
  const { ctx, calls } = mockInventoryCtx([
    { body: { code: 0, message: "success", contact: { contact_id: "1" } } },
  ]);
  const out = await action.execute({
    fields: {
      contact_name: "Acme Inc",
      contact_type: "customer",
      company_name: "Acme",
      website: "https://acme.example",
    },
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/inventory/v1/contacts");
  assertEquals(url.searchParams.get("organization_id"), "10234695");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    contact_name: "Acme Inc",
    contact_type: "customer",
    company_name: "Acme",
    website: "https://acme.example",
  });
  assertEquals(out, { contact_id: "1" });
});

Deno.test("contact-create: an empty fields param is rejected before any request", async () => {
  const { ctx, calls } = mockInventoryCtx([]);
  await assertRejects(
    async () => {
      await action.execute({ fields: "" }, ctx);
    },
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-create: is a non-idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
