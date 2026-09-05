import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-message.ts";

Deno.test("send-message: POSTs JSON to /messages and unwraps the data envelope", async () => {
  const data = { id: "msg1", type: "SMS", to: [{ phone_number: "+2", status: "queued" }] };
  const { ctx, calls } = mockCtx([{ body: { data } }]);

  const result = await action.execute!({ from: "+1", to: "+2", text: "hello" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/messages");
  assertEquals(calls[0].headers["content-type"], "application/json");

  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.from, "+1");
  assertEquals(body.to, "+2");
  assertEquals(body.text, "hello");
  assertEquals(body.messaging_profile_id, undefined);

  assertEquals(result, data);
});

Deno.test("send-message: sends via a Messaging Profile with no From", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ messagingProfileId: "MP1", to: "+2", text: "hi" }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.messaging_profile_id, "MP1");
  assertEquals(body.from, undefined);
});

Deno.test("send-message: requires a sender — from or messagingProfileId", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await action.execute!({ to: "+2", text: "x" }, ctx);
  } catch (e) {
    threw = true;
    assert((e as Error).message.includes("sender is required"), (e as Error).message);
  }
  assert(threw);
  assertEquals(calls.length, 0);
});

Deno.test("send-message: media URLs are sent as a media_urls array, blanks dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!(
    { from: "+1", to: "+2", text: "look", mediaUrls: ["https://x/a.jpg", "", "  "] },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.media_urls, ["https://x/a.jpg"]);
});

Deno.test("send-message: media_urls is omitted entirely when no media is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ from: "+1", to: "+2", text: "x" }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals("media_urls" in body, false);
});

Deno.test("send-message: sendAt is normalized to an ISO 8601 string", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!(
    { from: "+1", to: "+2", text: "later", sendAt: "2026-09-01T10:00:00Z" },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.send_at, "2026-09-01T10:00:00.000Z");
});

Deno.test("send-message: passes through type, encoding and webhook fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!(
    {
      from: "+1",
      to: "+2",
      text: "x",
      type: "MMS",
      encoding: "ucs2",
      webhookUrl: "https://example.com/hook",
      webhookFailoverUrl: "https://example.com/hook2",
      subject: "hi",
      autoDetect: true,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.type, "MMS");
  assertEquals(body.encoding, "ucs2");
  assertEquals(body.webhook_url, "https://example.com/hook");
  assertEquals(body.webhook_failover_url, "https://example.com/hook2");
  assertEquals(body.subject, "hi");
  assertEquals(body.auto_detect, true);
});
