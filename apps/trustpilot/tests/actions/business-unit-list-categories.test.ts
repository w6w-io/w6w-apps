import { assertEquals } from "@std/assert";
import action from "../../actions/business-unit-list-categories.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("business-unit-list-categories: builds the categories URL with optional filters", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { categories: [{ categoryId: "pet_store", isPrimary: true }] },
    },
  ]);

  const out = await action.execute(
    { businessUnitId: "bu1", country: "US", locale: "en-US" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/business-units/bu1/categories");
  const q = queryOf(calls[0].url);
  assertEquals(q.country, "US");
  assertEquals(q.locale, "en-US");
  assertEquals(out.categories[0].categoryId, "pet_store");
});

Deno.test("business-unit-list-categories: omits unset optional filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { categories: [] } }]);
  await action.execute({ businessUnitId: "bu1" }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(Object.keys(q).length, 0);
});
