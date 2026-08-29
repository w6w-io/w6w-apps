import { assertEquals } from "@std/assert";
import categoryCreate from "../../actions/category-create.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("category-create: posts to /v1/categories/create", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  const out = await categoryCreate.execute(
    { boardID: "b1", name: "Dashboard", subscribeAdmins: true },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].url, "https://canny.io/api/v1/categories/create");
  assertEquals(bodyOf(calls[0]), { boardID: "b1", name: "Dashboard", subscribeAdmins: true });
  assertEquals(out.id, "c1");
});

Deno.test("category-create: is not idempotent — no name-based get-or-create is documented", () => {
  assertEquals(categoryCreate.idempotent, false);
});
