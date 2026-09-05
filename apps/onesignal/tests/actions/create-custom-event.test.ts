import { assertEquals } from "@std/assert";
import createCustomEvent from "../../actions/create-custom-event.ts";
import { APP_ID, mockCtxWithInvocation, pathOf } from "../_helpers.ts";

Deno.test("create-custom-event: wraps the single event in the batch array the vendor expects", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ status: 202, body: {} }]);
  await createCustomEvent.execute(
    { name: "purchase", externalId: "user_1", properties: '{"amount": 9.99}' },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), `/apps/${APP_ID}/custom_events`);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.events.length, 1);
  assertEquals(body.events[0].name, "purchase");
  assertEquals(body.events[0].external_id, "user_1");
  assertEquals(body.events[0].properties, { amount: 9.99 });
});

Deno.test("create-custom-event: a 202 with no errors is accepted", async () => {
  const { ctx } = mockCtxWithInvocation([{ status: 202, body: {} }]);
  const out = await createCustomEvent.execute({ name: "purchase", externalId: "user_1" }, ctx);
  assertEquals(out, { accepted: true, errors: [] });
});

Deno.test("create-custom-event: a 202 WITH per-event errors is not accepted, despite the 2xx status", async () => {
  const { ctx } = mockCtxWithInvocation([{
    status: 202,
    body: { errors: [{ index: 0, error: "external_id does not resolve to a user" }] },
  }]);
  const out = await createCustomEvent.execute(
    { name: "purchase", externalId: "nonexistent" },
    ctx,
  ) as {
    accepted: boolean;
    errors: unknown[];
  };
  assertEquals(out.accepted, false);
  assertEquals(out.errors.length, 1);
});
