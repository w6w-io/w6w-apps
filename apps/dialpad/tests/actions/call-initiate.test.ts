import { assertEquals } from "@std/assert";
import callInitiate from "../../actions/call-initiate.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-initiate: POSTs /call with the ring body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { call_id: "1", state: "calling" } }]);
  await callInitiate.execute({ phoneNumber: "+14155550100", userId: "42" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/call");
  assertEquals(JSON.parse(calls[0].body!), {
    phone_number: "+14155550100",
    user_id: 42,
  });
});

Deno.test("call-initiate: coerces group id to a number and passes group type through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { call_id: "1" } }]);
  await callInitiate.execute(
    { phoneNumber: "+14155550100", userId: "42", groupId: "7", groupType: "office" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.group_id, 7);
  assertEquals(body.group_type, "office");
});

/**
 * Apify's precedent for this exact rule: no idempotency key on any run/ring
 * endpoint means a retry rings (and can bill) a second call.
 */
Deno.test("call-initiate: declared non-idempotent — no idempotency key on this endpoint", () => {
  assertEquals(callInitiate.idempotent, false);
});
