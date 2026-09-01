import { assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { dataEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create: posts to /v2/contacts with meta.type and mapped fields", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: dataEnvelope({ id: 2, name: "Mark Johnson" }) },
  ]);
  const out = await contactCreate.execute({
    lastName: "Johnson",
    firstName: "Mark",
    isOrganization: false,
    tags: "important, early-adopter",
    customFields: { known_via: "tom" },
  }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/contacts");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.meta, { type: "contact" });
  assertEquals(body.data.first_name, "Mark");
  assertEquals(body.data.last_name, "Johnson");
  assertEquals(body.data.is_organization, false);
  assertEquals(body.data.tags, ["important", "early-adopter"]);
  assertEquals(body.data.custom_fields, { known_via: "tom" });
  assertEquals(out.id, 2);
});

Deno.test("contact-create: extraFields overrides the typed fields", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 1 }) }]);
  await contactCreate.execute({
    lastName: "Johnson",
    extraFields: { last_name: "Overridden", fax: "+1-555-0100" },
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.last_name, "Overridden");
  assertEquals(body.data.fax, "+1-555-0100");
});

Deno.test("contact-create: omits unset optional fields rather than sending them as null/undefined", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 1 }) }]);
  await contactCreate.execute({ lastName: "Johnson" }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals("email" in body.data, false);
  assertEquals("address" in body.data, false);
  assertEquals("tags" in body.data, false);
});
