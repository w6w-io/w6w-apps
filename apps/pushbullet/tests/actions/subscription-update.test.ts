import { assertEquals } from "@std/assert";
import subscriptionUpdate from "../../actions/subscription-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-update: POSTs {muted} to /v2/subscriptions/{iden}", async () => {
  const { ctx, calls } = mockCtx([{ body: { iden: "s1", muted: true } }]);
  await subscriptionUpdate.execute({ iden: "s1", muted: true }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/subscriptions/s1");
  assertEquals(JSON.parse(calls[0].body!), { muted: true });
});

Deno.test("subscription-update: is declared idempotent", () => {
  assertEquals(subscriptionUpdate.idempotent, true);
});
