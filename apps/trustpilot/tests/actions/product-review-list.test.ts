import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/product-review-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("product-review-list: sends sku and filters, returns items", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { productReviews: [{ id: "pr1", stars: 4, content: "Nice" }] },
    },
  ]);

  const out = await action.execute(
    { businessUnitId: "bu1", sku: "ABCD-1234", language: "en", stars: 4 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/product-reviews/business-units/bu1/reviews");
  const q = queryOf(calls[0].url);
  assertEquals(q.sku, "ABCD-1234");
  assertEquals(q.language, "en");
  assertEquals(q.stars, "4");
  assertEquals(out.items[0].id, "pr1");
});

Deno.test("product-review-list: rejects when neither sku nor productUrl is given", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ businessUnitId: "bu1" }, ctx),
    Error,
    "sku or productUrl",
  );
});

Deno.test("product-review-list: productUrl alone is sufficient", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { productReviews: [] } }]);
  await action.execute(
    { businessUnitId: "bu1", productUrl: "http://example.com/p/1" },
    ctx,
  );
  assertEquals(queryOf(calls[0].url).productUrl, "http://example.com/p/1");
});
