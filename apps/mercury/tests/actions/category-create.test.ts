import { assertEquals } from "@std/assert";
import categoryCreate from "../../actions/category-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("category-create: POSTs /categories with all four required fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cat_new", name: "Software" } }]);
  await categoryCreate.execute(
    {
      name: "Software",
      visibleForCardSpend: true,
      visibleForOther: false,
      visibleForReimbursements: true,
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/api/v1/categories");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Software",
    visibleForCardSpend: true,
    visibleForOther: false,
    visibleForReimbursements: true,
  });
});
