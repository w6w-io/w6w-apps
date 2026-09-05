import { assertEquals } from "@std/assert";
import createPrivateReply from "../../actions/create-private-reply.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-private-reply: posts review_id and a nested private_reply object", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await createPrivateReply.execute({
    reviewId: 9,
    emailSubject: "About your review",
    emailBody: "Thanks for the feedback.",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/private_replies");
  assertEquals(JSON.parse(calls[0].body!), {
    review_id: 9,
    private_reply: { email_subject: "About your review", email_body: "Thanks for the feedback." },
  });
  assertEquals(out, { ok: true });
});
