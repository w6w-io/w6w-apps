import { assert, assertEquals } from "@std/assert";
import commentReplyList from "../../actions/comment-reply-list.ts";
import { collection, mockCtx, q, url } from "../_helpers.ts";

Deno.test("comment-reply-list: hits /videos/{id}/comments/{id}/replies", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([{ uri: "/videos/1/comments/9" }]) }]);
  const out = await commentReplyList.execute({ videoId: "1", commentId: "12345" }, ctx);
  assertEquals(url(calls[0]).pathname, "/videos/1/comments/12345/replies");
  assertEquals(out.total, 1);
});

Deno.test("comment-reply-list: forwards pagination and fields", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }]);
  await commentReplyList.execute(
    { videoId: "1", commentId: "2", page: 2, perPage: 50, fields: "uri,text" },
    ctx,
  );
  assertEquals(q(calls[0], "page"), "2");
  assertEquals(q(calls[0], "per_page"), "50");
  assertEquals(q(calls[0], "fields"), "uri,text");
});

/** Unlike the parent comment list, this endpoint documents no `direction`. */
Deno.test("comment-reply-list: offers no sort direction, because Vimeo documents none", () => {
  const keys = (commentReplyList.params ?? []).map((p) => p.key);
  assert(!keys.includes("direction"));
  assert(!keys.includes("sort"));
  assertEquals(commentReplyList.type, "search");
});
