import { assertEquals } from "@std/assert";
import createReply from "../../actions/create-reply.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-reply: posts review_id and a nested reply.content", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await createReply.execute({ reviewId: 9, content: "Thanks!" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/replies");
  assertEquals(JSON.parse(calls[0].body!), { review_id: 9, reply: { content: "Thanks!" } });
  assertEquals(out, { ok: true });
});

Deno.test("create-reply: forwards sendReplyEmail when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  await createReply.execute({ reviewId: 9, content: "Thanks!", sendReplyEmail: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).send_reply_email, false);
});
