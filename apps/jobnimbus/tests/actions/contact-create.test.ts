import { assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-create: POSTs the required fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { jnid: "new1" } }]);
  const out = await contactCreate.execute({
    first_name: "Sammy G",
    last_name: "Kent",
    record_type_name: "Customer",
    status_name: "Lead",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api1/contacts");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    first_name: "Sammy G",
    last_name: "Kent",
    record_type_name: "Customer",
    status_name: "Lead",
  });
  assertEquals(out, { jnid: "new1" });
});

Deno.test("contact-create: drops unset optional fields rather than sending them empty", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await contactCreate.execute({ record_type_name: "Customer", status_name: "Lead" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { record_type_name: "Customer", status_name: "Lead" });
});

Deno.test("contact-create: extra merges into the body and can override modeled fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await contactCreate.execute({
    record_type_name: "Customer",
    status_name: "Lead",
    first_name: "Sammy",
    extra: { first_name: "Overridden", cf_string_1: "note" },
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.first_name, "Overridden");
  assertEquals(body.cf_string_1, "note");
});

Deno.test("contact-create: actor goes on the query string, never in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await contactCreate.execute({
    record_type_name: "Customer",
    status_name: "Lead",
    actor: "sam@company.com",
  }, ctx);
  assertEquals(queryOf(calls[0].url), { actor: "sam@company.com" });
  assertEquals("actor" in JSON.parse(calls[0].body!), false);
});

Deno.test("contact-create: is not marked idempotent — each call creates a new record", () => {
  assertEquals(contactCreate.idempotent, false);
});
