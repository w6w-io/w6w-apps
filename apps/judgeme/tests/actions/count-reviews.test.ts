import { assertEquals } from "@std/assert";
import countReviews from "../../actions/count-reviews.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("count-reviews: returns the raw response body under `result`", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 12 } }]);
  const out = await countReviews.execute({ productId: 42 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1/reviews/count");
  assertEquals(queryOf(calls[0].url), { product_id: "42" });
  assertEquals(out, { result: { count: 12 } });
});

Deno.test("count-reviews: does not assume any particular response shape", async () => {
  // A bare JSON string is valid, undocumented-shape output — passed verbatim
  // (already JSON-encoded) since mockCtx treats a JS string body as raw text.
  const { ctx } = mockCtx([{ body: '"not even an object, and that\'s fine"' }]);
  const out = await countReviews.execute({}, ctx);
  assertEquals(out.result, "not even an object, and that's fine");
});
