import { assertEquals } from "@std/assert";
import sendPush from "../../actions/send-push.ts";
import { APP_ID, mockCtxWithInvocation, pathOf } from "../_helpers.ts";

Deno.test("send-push: builds contents/headings as locale maps, defaults target_channel", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ status: 200, body: { id: "msg-1" } }]);
  await sendPush.execute({
    contents: "Hello",
    headings: "Hi",
    includedSegments: "Subscribed Users",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(pathOf(calls[0].url), "/notifications");
  assertEquals(calls[0].method, "POST");
  assertEquals(body.app_id, APP_ID);
  assertEquals(body.contents, { en: "Hello" });
  assertEquals(body.headings, { en: "Hi" });
  assertEquals(body.included_segments, ["Subscribed Users"]);
  assertEquals(body.target_channel, "push");
});

Deno.test("send-push: falls back to invocationId when no idempotency key is given", async () => {
  const { ctx, calls } = mockCtxWithInvocation(
    [{ status: 200, body: { id: "msg-1" } }],
    APP_ID,
    "inv-abc",
  );
  await sendPush.execute({ contents: "Hello", includedSegments: "All" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.idempotency_key, "inv-abc");
});

Deno.test("send-push: an explicit idempotency key wins over the invocation id", async () => {
  const { ctx, calls } = mockCtxWithInvocation(
    [{ status: 200, body: { id: "msg-1" } }],
    APP_ID,
    "inv-abc",
  );
  await sendPush.execute(
    { contents: "Hello", includedSegments: "All", idempotencyKey: "custom-key" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.idempotency_key, "custom-key");
});

Deno.test("send-push: omits headings/subtitle/url when left blank", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ status: 200, body: { id: "msg-1" } }]);
  await sendPush.execute({ contents: "Hello", includeSubscriptionIds: "sub-1" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("headings" in body, false);
  assertEquals("subtitle" in body, false);
  assertEquals("url" in body, false);
  assertEquals(body.include_subscription_ids, ["sub-1"]);
});
