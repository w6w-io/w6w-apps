import { assertEquals } from "@std/assert";
import customFieldList from "../../actions/custom-field-list.ts";
import { entries, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("custom-field-list: lists a list's custom field definitions", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([{ id: 1, name: "Favorite color" }]) }]);
  const out = await customFieldList.execute({ accountId: "1", listId: "2" }, ctx) as {
    entries: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/custom_fields");
  assertEquals(out.entries.length, 1);
});
