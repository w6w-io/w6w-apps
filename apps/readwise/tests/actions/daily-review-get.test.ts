import { assertEquals } from "@std/assert";
import dailyReviewGet from "../../actions/daily-review-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("daily-review-get: GETs /review/ with no parameters", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        review_id: 877266693,
        review_url: "https://readwise.io/reviews/877266693",
        review_completed: false,
        highlights: [],
      },
    },
  ]);
  const out = await dailyReviewGet.execute({}, ctx) as {
    review_id: number;
    review_completed: boolean;
  };

  assertEquals(pathOf(calls[0].url), "/api/v2/review/");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.review_id, 877266693);
  assertEquals(out.review_completed, false);
});

Deno.test("daily-review-get: takes no parameters", () => {
  assertEquals(dailyReviewGet.params?.length, 0);
});
