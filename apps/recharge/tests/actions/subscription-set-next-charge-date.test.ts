import { assertEquals } from "@std/assert";
import subscriptionSetNextChargeDate from "../../actions/subscription-set-next-charge-date.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-set-next-charge-date: POSTs the date to set_next_charge_date", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope("subscription", { id: 1, next_charge_scheduled_at: "2026-12-25" }) },
  ]);
  await subscriptionSetNextChargeDate.execute({ subscriptionId: "1", date: "2026-12-25" }, ctx);
  assertEquals(pathOf(calls[0].url), "/subscriptions/1/set_next_charge_date");
  assertEquals(JSON.parse(calls[0].body!), { date: "2026-12-25" });
});

Deno.test("subscription-set-next-charge-date: is marked idempotent", () => {
  assertEquals(subscriptionSetNextChargeDate.idempotent, true);
});
