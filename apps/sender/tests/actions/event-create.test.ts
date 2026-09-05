import { assertEquals, assertRejects } from "@std/assert";
import eventCreate from "../../actions/event-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-create: POSTs to /v2/events with a nested subscriber object", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, message: "Event created" } }]);
  await eventCreate.execute(
    {
      subscriberEmail: "a@b.com",
      type: "product_viewed",
      value: 6.7,
      valueCurrency: "USD",
      properties: '{"int": 123}',
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/events");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.subscriber, { email: "a@b.com" });
  assertEquals(body.type, "product_viewed");
  assertEquals(body.value_currency, "USD");
  assertEquals(body.properties, { int: 123 });
});

Deno.test("event-create: rejects when no subscriber identifier is given, without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => {
    await eventCreate.execute({ type: "product_viewed" }, ctx);
  });
  assertEquals(calls.length, 0);
});
