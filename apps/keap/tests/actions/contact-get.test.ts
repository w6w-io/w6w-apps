import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { faultBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-get: reads one contact by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "42", given_name: "Jo" } }]);
  const out = await contactGet.execute({ contactId: "42" }, ctx) as { id: string };
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/contacts/42");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.id, "42");
});

Deno.test("contact-get: passes the sparse-fields selector through comma-delimited", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await contactGet.execute({ contactId: "42", fields: "custom_fields,tag_ids" }, ctx);
  assertEquals(queryOf(calls[0].url).fields, "custom_fields,tag_ids");
});

Deno.test("contact-get: a pasted path fragment cannot re-target the request", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await contactGet.execute({ contactId: "../../users/me" }, ctx);
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/contacts/..%2F..%2Fusers%2Fme");
});

Deno.test("contact-get: a gateway failure surfaces the vendor's machine code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: faultBody("keymanagement.service.invalid_access_token", "Invalid Access Token"),
  }]);
  const error = await assertRejects(
    async () => await contactGet.execute({ contactId: "42" }, ctx),
    Error,
  );
  assertStringIncludes(error.message, "keymanagement.service.invalid_access_token");
});
