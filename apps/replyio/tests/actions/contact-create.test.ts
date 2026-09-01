import { assert, assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create: POSTs only the fields provided, dropping the rest", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1, email: "a@b.com" } }]);
  await contactCreate.execute({ email: "a@b.com", firstName: "Ada" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/contacts");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com", firstName: "Ada" });
});

/**
 * The vendor's own OpenAPI document spells this enum in PascalCase on write and
 * camelCase on read — a request built with the read-side casing is silently
 * wrong shaped. This pins the write side.
 */
Deno.test("contact-create: companySize is sent PascalCase, matching the write schema", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await contactCreate.execute({ email: "a@b.com", companySize: "SelfEmployed" }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.companySize, "SelfEmployed");
});

Deno.test("contact-create: customFields is parsed from a JSON string param", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await contactCreate.execute(
    { email: "a@b.com", customFields: '[{"key":"leadSource","value":"Conference"}]' },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.customFields, [{ key: "leadSource", value: "Conference" }]);
});

Deno.test("contact-create: is not idempotent — Reply mints a new id per call", () => {
  assertEquals(contactCreate.idempotent, false);
  assert(contactCreate.type === "perform");
});
