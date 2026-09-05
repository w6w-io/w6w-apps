import { assertEquals } from "@std/assert";
import sendEmail from "../../actions/send-email.ts";
import { mockCtxWithInvocation, pathOf } from "../_helpers.ts";

Deno.test("send-email: posts to the bare /notifications, never ?c=email", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ status: 200, body: { id: "msg-1" } }]);
  await sendEmail.execute(
    { emailSubject: "Hi", emailBody: "<p>Hi</p>", includedSegments: "All" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/notifications");
  assertEquals(new URL(calls[0].url).search, "");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.email_subject, "Hi");
  assertEquals(body.email_body, "<p>Hi</p>");
  assertEquals(body.target_channel, "email");
});

Deno.test("send-email: a direct emailTo bypasses segment targeting fields", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ status: 200, body: { id: "msg-1" } }]);
  await sendEmail.execute(
    { emailSubject: "Hi", emailBody: "<p>Hi</p>", emailTo: "a@example.com" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.email_to, "a@example.com");
  assertEquals("included_segments" in body, false);
});
