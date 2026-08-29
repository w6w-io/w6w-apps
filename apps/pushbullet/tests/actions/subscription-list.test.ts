import { assertEquals } from "@std/assert";
import subscriptionList from "../../actions/subscription-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("subscription-list: GETs /v2/subscriptions", async () => {
  const { ctx, calls } = mockCtx([{ body: { subscriptions: [{ iden: "s1" }] } }]);
  const out = await subscriptionList.execute({}, ctx) as { subscriptions: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/subscriptions");
  assertEquals(out.subscriptions.length, 1);
});
