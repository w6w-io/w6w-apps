import { assert, assertEquals } from "@std/assert";
import updateReview from "../../actions/update-review.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("update-review: PUTs to the correctly-slashed /reviews/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "Action performed successful" } }]);
  const out = await updateReview.execute({ id: 55, curated: "ok" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v1/reviews/55");
  assert(
    !pathOf(calls[0].url).startsWith("//"),
    "must not reproduce the doc's un-slashed path key",
  );
  assertEquals(JSON.parse(calls[0].body!), { curated: "ok" });
  assertEquals(out, { message: "Action performed successful" });
});

Deno.test("update-review: is marked idempotent — repeating a curated status is a safe overwrite", () => {
  assertEquals(updateReview.idempotent, true);
});
