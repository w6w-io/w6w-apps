import { assertEquals } from "@std/assert";
import contactCustomFieldList from "../../actions/contact-custom-field-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-custom-field-list: GETs /v1/contact-custom-fields", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [{ key: "k", name: "n", type: "string" }] },
  }]);
  const out = await contactCustomFieldList.execute({}, ctx) as { data: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/contact-custom-fields");
  assertEquals(out.data.length, 1);
});

Deno.test("contact-custom-field-list: is a search action with no params", () => {
  assertEquals(contactCustomFieldList.type, "search");
  assertEquals(contactCustomFieldList.params, []);
});
