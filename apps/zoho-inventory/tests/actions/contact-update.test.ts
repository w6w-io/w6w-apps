import { assertEquals } from "@std/assert";
import { mockInventoryCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

Deno.test("contact-update: PUTs /contacts/{id} with only the changed fields", async () => {
  const { ctx, calls } = mockInventoryCtx([
    { body: { code: 0, message: "success", contact: { contact_id: "1" } } },
  ]);
  const out = await action.execute(
    { recordId: "1", fields: { company_name: "Acme Corporation" } },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/inventory/v1/contacts/1");
  assertEquals(url.searchParams.get("organization_id"), "10234695");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { company_name: "Acme Corporation" });
  assertEquals(out, { contact_id: "1" });
});

Deno.test("contact-update: is an idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
