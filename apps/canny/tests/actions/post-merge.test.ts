import { assertEquals } from "@std/assert";
import postMerge from "../../actions/post-merge.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("post-merge: posts the merge triple, unwraps the confirmation", async () => {
  const { ctx, calls } = mockCtx([{ body: "success" }]);
  const out = await postMerge.execute(
    { mergePostID: "p2", intoPostID: "p1", mergerID: "admin1" },
    ctx,
  ) as { message: string };

  assertEquals(calls[0].url, "https://canny.io/api/v1/posts/merge");
  assertEquals(bodyOf(calls[0]), { mergePostID: "p2", intoPostID: "p1", mergerID: "admin1" });
  assertEquals(out.message, "success");
});

Deno.test("post-merge: is not idempotent — mergePostID stops existing after success", () => {
  assertEquals(postMerge.idempotent, false);
});
