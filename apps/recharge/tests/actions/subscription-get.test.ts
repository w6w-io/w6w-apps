import { assertEquals } from "@std/assert";
import subscriptionGet from "../../actions/subscription-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-get: hits GET /subscriptions/{id} and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope("subscription", { id: 63898947, status: "active" }) },
  ]);
  const out = await subscriptionGet.execute({ subscriptionId: "63898947" }, ctx);
  assertEquals(pathOf(calls[0].url), "/subscriptions/63898947");
  assertEquals(out, { id: 63898947, status: "active" });
});
