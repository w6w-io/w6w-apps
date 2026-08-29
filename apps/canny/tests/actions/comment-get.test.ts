import { assertEquals } from "@std/assert";
import commentGet from "../../actions/comment-get.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("comment-get: retrieves by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cm1" } }]);
  await commentGet.execute({ id: "cm1" }, ctx);

  assertEquals(calls[0].url, "https://canny.io/api/v1/comments/retrieve");
  assertEquals(bodyOf(calls[0]), { id: "cm1" });
});
