import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/product-review-batch-summaries.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("product-review-batch-summaries: POSTs a parsed SKU array and returns items", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { summaries: [{ sku: "ABCD-1234", starsAverage: 3.1 }] },
    },
  ]);

  const out = await action.execute(
    { businessUnitId: "bu1", skus: "ABCD-1234,\nACDC-4321" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(
    pathOf(calls[0].url),
    "/v1/product-reviews/business-units/bu1/batch-summaries",
  );
  assertEquals(JSON.parse(calls[0].body!), { skus: ["ABCD-1234", "ACDC-4321"] });
  assertEquals(out.items[0].sku, "ABCD-1234");
});

Deno.test("product-review-batch-summaries: rejects when no SKU survives parsing", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ businessUnitId: "bu1", skus: "  ,  \n " }, ctx),
    Error,
    "at least one SKU",
  );
});
