import { assertEquals } from "@std/assert";
import campaignCreate from "../../actions/campaign-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-create: POSTs to /v2/campaigns and converts googleAnalytics to 1/0", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, message: "Campaign created", data: { id: "c1" } },
  }]);
  await campaignCreate.execute(
    {
      subject: "Subject",
      from: "Sender support",
      replyTo: "support@sender.net",
      contentType: "text",
      googleAnalytics: true,
      content: "Hello",
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/campaigns");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.google_analytics, 1);
  assertEquals(body.reply_to, "support@sender.net");
  assertEquals(body.content_type, "text");
});

Deno.test("campaign-create: omits google_analytics entirely when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "c1" } } }]);
  await campaignCreate.execute(
    { subject: "S", from: "F", replyTo: "r@x.com", contentType: "html" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals("google_analytics" in body, false);
});
