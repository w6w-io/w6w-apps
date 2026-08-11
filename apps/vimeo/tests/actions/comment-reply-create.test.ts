import { assertEquals } from "@std/assert";
import commentReplyCreate from "../../actions/comment-reply-create.ts";
import { jsonBody, mockCtx, q, url } from "../_helpers.ts";

const reply = { uri: "/videos/1/comments/999", text: "Agreed" };

Deno.test("comment-reply-create: POSTs the replies collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: reply }]);
  await commentReplyCreate.execute({ videoId: "1", commentId: "12345", text: "Agreed" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(url(calls[0]).pathname, "/videos/1/comments/12345/replies");
  assertEquals(jsonBody(calls[0]), { text: "Agreed" });
});

/** On replies Vimeo marks `text` required outright, unlike create_comment's either/or. */
Deno.test("comment-reply-create: text is required by the vendor, not by choice", () => {
  const text = (commentReplyCreate.params ?? []).find((p) => p.key === "text");
  assertEquals(text?.required, true);
  const richtext = (commentReplyCreate.params ?? []).find((p) => p.key === "richtext");
  assertEquals(richtext?.required, undefined);
});

Deno.test("comment-reply-create: fields goes on the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: reply }]);
  await commentReplyCreate.execute(
    { videoId: "1", commentId: "2", text: "x", fields: "uri" },
    ctx,
  );
  assertEquals(q(calls[0], "fields"), "uri");
});

Deno.test("comment-reply-create: is explicitly not idempotent", () => {
  assertEquals(commentReplyCreate.type, "perform");
  assertEquals(commentReplyCreate.idempotent, false);
});
