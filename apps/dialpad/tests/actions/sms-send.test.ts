import { assertEquals, assertRejects } from "@std/assert";
import smsSend from "../../actions/sms-send.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("sms-send: POSTs /sms and splits comma-separated numbers", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1", message_status: "pending" } }]);
  await smsSend.execute({ toNumbers: "+14155550100, +14155550101", text: "hi", userId: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/sms");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.to_numbers, ["+14155550100", "+14155550101"]);
  assertEquals(body.text, "hi");
  assertEquals(body.user_id, 1);
});

Deno.test("sms-send: accepts a channel hashtag instead of numbers", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }]);
  await smsSend.execute({ channelHashtag: "#eng", text: "hi" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).channel_hashtag, "#eng");
});

Deno.test("sms-send: fails before any request when neither recipient form is given", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await smsSend.execute({ text: "hi" }, ctx),
    Error,
    "To numbers or Channel hashtag",
  );
  assertEquals(calls.length, 0);
});

Deno.test("sms-send: fails before any request when neither text nor media is given", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await smsSend.execute({ toNumbers: "+14155550100" }, ctx),
    Error,
    "Text or Media",
  );
  assertEquals(calls.length, 0);
});

Deno.test("sms-send: declared non-idempotent — no idempotency key on this endpoint", () => {
  assertEquals(smsSend.idempotent, false);
});
