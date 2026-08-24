import { assertEquals } from "@std/assert";
import contactFieldList from "../../actions/contact-field-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-field-list: fetches /api/contact_fields with no query params", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ slug: "country", fieldName: "Country" }]) }]);
  await contactFieldList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api/contact_fields");
  assertEquals(queryOf(calls[0].url), {});
});
