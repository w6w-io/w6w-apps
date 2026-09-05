import { assertEquals, assertRejects } from "@std/assert";
import subscriptionChangeDueDay from "../../actions/subscription-change-due-day.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-change-due-day - PATCHes the subscriber path with due_day in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await subscriptionChangeDueDay.execute(
    { subscriberCode: "B2HNQAXJ", dueDay: 5 },
    ctx,
  );
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/payments/api/v1/subscriptions/B2HNQAXJ");
  assertEquals(calls[0].body, JSON.stringify({ due_day: 5 }));
  assertEquals(out, { ok: true });
});

Deno.test("subscription-change-due-day - is declared non-idempotent", () => {
  assertEquals(subscriptionChangeDueDay.idempotent, false);
});

Deno.test("subscription-change-due-day - surfaces subscription_in_trial_period", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: errorBody("subscription_in_trial_period", "cannot change during trial") },
  ]);
  await assertRejects(
    () =>
      Promise.resolve(subscriptionChangeDueDay.execute({ subscriberCode: "X", dueDay: 5 }, ctx)),
    Error,
    "subscription_in_trial_period",
  );
});
