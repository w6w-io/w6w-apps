import { assertEquals } from "@std/assert";
import commentGet from "../../actions/comment-get.ts";
import { envelope, mockWrikeCtx, pathOf } from "../_helpers.ts";

Deno.test("comment-get: joins ids into the path", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: envelope([{ id: "C1" }]) }]);
  await commentGet.execute({ commentIds: "C1,C2" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v4/comments/C1,C2");
});
