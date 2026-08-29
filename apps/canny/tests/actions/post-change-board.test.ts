import { assertEquals } from "@std/assert";
import postChangeBoard from "../../actions/post-change-board.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("post-change-board: moves a post, unwraps the confirmation string", async () => {
  const { ctx, calls } = mockCtx([{ body: "success" }]);
  const out = await postChangeBoard.execute({ postID: "p1", boardID: "b2" }, ctx) as {
    message: string;
  };

  assertEquals(calls[0].url, "https://canny.io/api/v1/posts/change_board");
  assertEquals(bodyOf(calls[0]), { postID: "p1", boardID: "b2" });
  assertEquals(out.message, "success");
});
