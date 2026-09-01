import { assertEquals } from "@std/assert";
import customFieldList from "../../actions/custom-field-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("custom-field-list: GETs /v3/custom-fields and returns the bare array unwrapped", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ id: 1, title: "Budget", fieldType: "text", orgWide: false }] },
  ]);
  const out = await customFieldList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/custom-fields");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, [{ id: 1, title: "Budget", fieldType: "text", orgWide: false }]);
});

Deno.test("custom-field-list: takes no parameters — there is no paging on this endpoint", () => {
  assertEquals(customFieldList.params?.length, 0);
});
