import { assertEquals } from "@std/assert";
import action from "../../actions/contact-create.ts";
import { mockMoneybirdCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create: POSTs /contacts.json wrapping fields under `contact`", async () => {
  const { ctx, calls } = mockMoneybirdCtx([{ status: 201, body: { id: "c1" } }]);
  await action.execute({ companyName: "Acme B.V.", country: "NL" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/123/contacts.json");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    contact: { company_name: "Acme B.V.", country: "NL" },
  });
});

Deno.test("contact-create: omits unset fields entirely rather than sending them blank", async () => {
  const { ctx, calls } = mockMoneybirdCtx([{ status: 201, body: {} }]);
  await action.execute({ firstname: "Ada", lastname: "Lovelace" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { contact: { firstname: "Ada", lastname: "Lovelace" } });
});

Deno.test("contact-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
