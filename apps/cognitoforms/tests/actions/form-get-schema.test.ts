import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-get-schema.ts";

Deno.test("form-get-schema: GETs /forms/{formId}/schema with the query flags", async () => {
  const { ctx, calls } = mockCtx([{ body: { type: "object", properties: {} } }]);
  const result = await action.execute({ formId: "42", input: true, includeLinks: false }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/forms/42/schema");
  assertEquals(url.searchParams.get("input"), "true");
  assertEquals(url.searchParams.get("includeLinks"), "false");
  assertEquals(result, { schema: { type: "object", properties: {} } });
});

Deno.test("form-get-schema: omits unset optional flags and encodes the form ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ formId: "form/with slash" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/forms/form%2Fwith%20slash/schema");
  assertEquals(url.search, "");
});
