import { assertEquals } from "@std/assert";
import subscriptionDelete from "../../actions/subscription-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-delete: DELETEs /v2/subscriptions/{iden}", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await subscriptionDelete.execute({ iden: "s1" }, ctx) as { deleted: boolean };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/subscriptions/s1");
  assertEquals(out.deleted, true);
});

Deno.test("subscription-delete: is declared idempotent", () => {
  assertEquals(subscriptionDelete.idempotent, true);
});
