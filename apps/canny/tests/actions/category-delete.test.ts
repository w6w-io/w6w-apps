import { assertEquals } from "@std/assert";
import categoryDelete from "../../actions/category-delete.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("category-delete: posts categoryID and unwraps the confirmation string", async () => {
  const { ctx, calls } = mockCtx([{ body: '"success"' }]);
  const out = await categoryDelete.execute({ categoryID: "c1" }, ctx) as { message: string };

  assertEquals(calls[0].url, "https://canny.io/api/v1/categories/delete");
  assertEquals(bodyOf(calls[0]), { categoryID: "c1" });
  assertEquals(out.message, "success");
});

Deno.test("category-delete: is idempotent", () => {
  assertEquals(categoryDelete.idempotent, true);
});
