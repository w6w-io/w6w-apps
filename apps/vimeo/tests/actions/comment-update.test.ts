import { assertEquals } from "@std/assert";
import commentUpdate from "../../actions/comment-update.ts";
import { jsonBody, mockCtx, q, url } from "../_helpers.ts";

const comment = { uri: "/videos/1/comments/12345", text: "Edited" };

Deno.test("comment-update: PATCHes /videos/{id}/comments/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: comment }]);
  await commentUpdate.execute({ videoId: "1", commentId: "12345", text: "Edited" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(url(calls[0]).pathname, "/videos/1/comments/12345");
  assertEquals(jsonBody(calls[0]), { text: "Edited" });
});

Deno.test("comment-update: richtext is forwarded as a string alongside the text", async () => {
  const doc = '{"type":"doc","content":[]}';
  const { ctx, calls } = mockCtx([{ body: comment }]);
  await commentUpdate.execute({ videoId: "1", commentId: "2", text: "x", richtext: doc }, ctx);
  assertEquals(jsonBody(calls[0]), { text: "x", richtext: doc });
});

Deno.test("comment-update: fields goes on the query", async () => {
  const { ctx, calls } = mockCtx([{ body: comment }]);
  await commentUpdate.execute({ videoId: "1", commentId: "2", text: "x", fields: "uri" }, ctx);
  assertEquals(q(calls[0], "fields"), "uri");
});

Deno.test("comment-update: is a convergent perform", () => {
  assertEquals(commentUpdate.type, "perform");
  assertEquals(commentUpdate.idempotent, true);
});
