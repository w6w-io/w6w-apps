import { assertEquals } from "@std/assert";
import action from "../../actions/product-review-get-summary.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("product-review-get-summary: sends sku and returns the summary", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        numberOfReviews: { total: 14, oneStar: 2, fiveStars: 2 },
        starsAverage: 3.1,
      },
    },
  ]);

  const out = await action.execute({ businessUnitId: "bu1", sku: "ABCD-1234,ACDC-4321" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/product-reviews/business-units/bu1");
  assertEquals(queryOf(calls[0].url).sku, "ABCD-1234,ACDC-4321");
  assertEquals(out.starsAverage, 3.1);
  assertEquals(out.numberOfReviews?.total, 14);
});
