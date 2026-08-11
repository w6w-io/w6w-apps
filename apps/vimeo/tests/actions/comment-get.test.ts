import { assertEquals } from "@std/assert";
import commentGet from "../../actions/comment-get.ts";
import { mockCtx, q, url } from "../_helpers.ts";

const comment = { uri: "/videos/1/comments/12345", text: "I love this!" };

/** A comment is addressed through its video, never on its own. */
Deno.test("comment-get: fetches /videos/{id}/comments/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: comment }]);
  const out = await commentGet.execute(
    { videoId: "/videos/258684937", commentId: "/videos/258684937/comments/12345" },
    ctx,
  ) as typeof comment;
  assertEquals(url(calls[0]).pathname, "/videos/258684937/comments/12345");
  assertEquals(out.text, "I love this!");
});

Deno.test("comment-get: forwards the fields filter", async () => {
  const { ctx, calls } = mockCtx([{ body: comment }]);
  await commentGet.execute({ videoId: "1", commentId: "2", fields: "uri,text" }, ctx);
  assertEquals(q(calls[0], "fields"), "uri,text");
});

Deno.test("comment-get: needs both ids", () => {
  const required = (commentGet.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["videoId", "commentId"]);
  assertEquals(commentGet.type, "read");
});
