import { assertEquals, assertRejects } from "@std/assert";
import contactUpsert from "../../actions/contact-upsert.ts";
import { dataEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-upsert: posts to /v2/contacts/upsert with the filter in the QUERY string", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 2 }) }]);
  await contactUpsert.execute({ filterEmail: "mark@example.com", phone: "508" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/contacts/upsert");
  assertEquals(queryOf(calls[0].url), { email: "mark@example.com" });
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.phone, "508");
});

Deno.test("contact-upsert: refuses to run with no filter, and makes no request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await contactUpsert.execute({ name: "Design Co" }, ctx),
    Error,
    "at least one filter",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-upsert: a custom-field filter is sent bracket-syntax", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 2 }) }]);
  await contactUpsert.execute(
    { filterCustomFieldName: "external_id", filterCustomFieldValue: "SKU01" },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), { "custom_fields[external_id]": "SKU01" });
});
