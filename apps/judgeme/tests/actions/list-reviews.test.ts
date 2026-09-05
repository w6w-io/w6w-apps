import { assertEquals } from "@std/assert";
import listReviews from "../../actions/list-reviews.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-reviews: sends only the params provided, as query string", async () => {
  const { ctx, calls } = mockCtx([
    { body: { current_page: 1, per_page: 10, reviews: [{ id: 1 }] } },
  ]);
  const out = await listReviews.execute({ productId: 42, rating: 5 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1/reviews");
  assertEquals(queryOf(calls[0].url), { product_id: "42", rating: "5" });
  assertEquals(out, { currentPage: 1, perPage: 10, reviews: [{ id: 1 }] });
});

Deno.test("list-reviews: defaults reviews to [] when the body omits it", async () => {
  const { ctx } = mockCtx([{ body: { current_page: 1, per_page: 10 } }]);
  const out = await listReviews.execute({}, ctx);
  assertEquals(out.reviews, []);
});

Deno.test("list-reviews: passes page/perPage/reviewerId through", async () => {
  const { ctx, calls } = mockCtx([{ body: { reviews: [] } }]);
  await listReviews.execute({ page: 2, perPage: 5, reviewerId: 7 }, ctx);
  assertEquals(queryOf(calls[0].url), { page: "2", per_page: "5", reviewer_id: "7" });
});
