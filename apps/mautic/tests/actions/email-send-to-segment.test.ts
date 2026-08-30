import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/email-send-to-segment.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("email-send-to-segment: POSTs /emails/{id}/send with no body when segmentIds is blank", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { success: true, sentCount: 12, failedRecipients: 0 } },
  ], conn);
  const out = await action.execute!({ emailId: 1 }, ctx);
  assertEquals(calls[0].url, "https://mautic.example.com/api/emails/1/send");
  assertEquals(calls[0].body, "{}");
  assertEquals(out, { success: true, sentCount: 12, failedRecipients: 0 });
});

Deno.test("email-send-to-segment: segmentIds overrides the email's own assigned segments", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true } }], conn);
  await action.execute!({ emailId: 1, segmentIds: "3, 7" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).listIds, [3, 7]);
});
