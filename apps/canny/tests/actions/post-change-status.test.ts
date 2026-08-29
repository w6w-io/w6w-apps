import { assertEquals } from "@std/assert";
import postChangeStatus from "../../actions/post-change-status.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("post-change-status: posts every required field, defaulting commentImageURLs to []", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1", status: "planned" } }]);
  await postChangeStatus.execute(
    {
      changerID: "admin1",
      postID: "p1",
      status: "planned",
      shouldNotifyVoters: true,
      commentValue: "Now planned for next quarter.",
    },
    ctx,
  );

  assertEquals(calls[0].url, "https://canny.io/api/v1/posts/change_status");
  assertEquals(bodyOf(calls[0]), {
    changerID: "admin1",
    postID: "p1",
    status: "planned",
    shouldNotifyVoters: true,
    commentValue: "Now planned for next quarter.",
    commentImageURLs: [],
  });
});

Deno.test("post-change-status: is not idempotent — retrying would duplicate the comment", () => {
  assertEquals(postChangeStatus.idempotent, false);
});
