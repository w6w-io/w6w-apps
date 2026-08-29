import { assertEquals } from "@std/assert";
import dailyReviewComplete from "../../actions/daily-review-complete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("daily-review-complete: POSTs to /review/complete/", async () => {
  const { ctx, calls } = mockCtx([{ body: { review_id: 877266693, review_completed: true } }]);
  const out = await dailyReviewComplete.execute({}, ctx) as { review_completed: boolean };

  assertEquals(pathOf(calls[0].url), "/api/v2/review/complete/");
  assertEquals(calls[0].method, "POST");
  assertEquals(out.review_completed, true);
});

Deno.test("daily-review-complete: is idempotent — completing twice leaves the same state", () => {
  assertEquals(dailyReviewComplete.idempotent, true);
});
