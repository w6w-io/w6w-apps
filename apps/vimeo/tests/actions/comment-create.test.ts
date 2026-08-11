import { assert, assertEquals } from "@std/assert";
import commentCreate from "../../actions/comment-create.ts";
import { jsonBody, mockCtx, q, url } from "../_helpers.ts";

const comment = { uri: "/videos/1/comments/12345", text: "I love this!" };

Deno.test("comment-create: POSTs /videos/{id}/comments with the text", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: comment }]);
  await commentCreate.execute({ videoId: "/videos/1", text: "I love this!" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(url(calls[0]).pathname, "/videos/1/comments");
  assertEquals(jsonBody(calls[0]), { text: "I love this!" });
});

/**
 * `richtext` is "the rich comment in JSON stringified form" — Vimeo wants the
 * STRING, so it is a `code` param, not a `json` one whose value would arrive
 * already parsed and therefore the wrong type.
 */
Deno.test("comment-create: richtext is forwarded as a string, not an object", async () => {
  const doc = '{"type":"doc","content":[]}';
  const { ctx, calls } = mockCtx([{ status: 201, body: comment }]);
  await commentCreate.execute({ videoId: "1", text: "hi", richtext: doc }, ctx);
  assertEquals(jsonBody(calls[0]), { text: "hi", richtext: doc });
  const param = (commentCreate.params ?? []).find((p) => p.key === "richtext");
  assertEquals(param?.type, "code");
});

/** Sending neither text nor richtext is a 400 (error code 2207), so text is required. */
Deno.test("comment-create: text is required", () => {
  const text = (commentCreate.params ?? []).find((p) => p.key === "text");
  assertEquals(text?.required, true);
});

Deno.test("comment-create: fields goes on the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: comment }]);
  await commentCreate.execute({ videoId: "1", text: "hi", fields: "uri,text" }, ctx);
  assertEquals(q(calls[0], "fields"), "uri,text");
});

/** Every call posts another comment and there is no idempotency key. */
Deno.test("comment-create: is explicitly not idempotent", () => {
  assertEquals(commentCreate.type, "perform");
  assertEquals(commentCreate.idempotent, false);
  assert(!("richtext" in { ...commentCreate }));
});
