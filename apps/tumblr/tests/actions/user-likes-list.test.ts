import { assertEquals } from "@std/assert";
import userLikesList from "../../actions/user-likes-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-likes-list: calls GET /v2/user/likes", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ liked_posts: [], liked_count: 0 }) }]);
  await userLikesList.execute({ after: 100 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/user/likes");
});
