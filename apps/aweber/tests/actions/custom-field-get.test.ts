import { assertEquals } from "@std/assert";
import customFieldGet from "../../actions/custom-field-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("custom-field-get: fetches one custom field by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "3", name: "Favorite color" } }]);
  const out = await customFieldGet.execute(
    { accountId: "1", listId: "2", customFieldId: "3" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/custom_fields/3");
  assertEquals(out.name, "Favorite color");
});
