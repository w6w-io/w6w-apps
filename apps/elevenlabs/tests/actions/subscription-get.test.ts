import { assertEquals } from "@std/assert";
import subscriptionGet from "../../actions/subscription-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const SUBSCRIPTION = {
  tier: "creator",
  status: "active",
  character_count: 17231,
  character_limit: 100000,
  next_character_count_reset_unix: 1738356858,
  voice_slots_used: 1,
  voice_limit: 120,
  current_overage: { amount: "0", currency: "usd" },
};

Deno.test("subscription-get: reads the subscription and returns it verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: SUBSCRIPTION }]);
  assertEquals(await subscriptionGet.execute({}, ctx), SUBSCRIPTION);
  assertEquals(pathOf(calls[0].url), "/v1/user/subscription");
});

/**
 * Unlike the whoami, this response carries no credential at all — which is what
 * makes the same endpoint safe to use as the health probe.
 */
Deno.test("subscription-get: returns the body untouched, because nothing in it is secret", async () => {
  const { ctx } = mockCtx([{ body: { ...SUBSCRIPTION, tier: "pro" } }]);
  const out = await subscriptionGet.execute({}, ctx) as Record<string, unknown>;
  assertEquals(out.tier, "pro");
  assertEquals(Object.keys(out).length, Object.keys(SUBSCRIPTION).length);
});

Deno.test("subscription-get: takes no parameters", () => {
  assertEquals(subscriptionGet.params, []);
  assertEquals(subscriptionGet.type, "read");
});
