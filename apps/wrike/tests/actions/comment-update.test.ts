import { assertEquals } from "@std/assert";
import commentUpdate from "../../actions/comment-update.ts";
import { envelope, mockWrikeCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("comment-update: PUTs to /comments/{commentId}", async () => {
  const { ctx, calls } = mockWrikeCtx([
    { status: 200, body: envelope([{ id: "C1", text: "edited" }]) },
  ]);
  await commentUpdate.execute({ commentId: "C1", text: "edited" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v4/comments/C1");
  assertEquals(queryOf(calls[0].url), { text: "edited" });
});

Deno.test("comment-update: the 5-minute edit window is documented on the action, not silently swallowed", () => {
  assertEquals(commentUpdate.description?.includes("5 minutes"), true);
});
