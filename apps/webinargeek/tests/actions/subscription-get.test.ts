import { assertEquals } from "@std/assert";
import subscriptionGet from "../../actions/subscription-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-get: hits GET /subscriptions/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, email: "john@smith.com" } }]);
  const out = await subscriptionGet.execute({ id: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/subscriptions/1");
  assertEquals(out, { id: 1, email: "john@smith.com" });
});
