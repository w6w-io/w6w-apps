import { assertEquals } from "@std/assert";
import updateSubscription from "../../actions/update-subscription.ts";
import { APP_ID, mockCtxWithConnection, pathOf } from "../_helpers.ts";

Deno.test("update-subscription: PATCHes only the fields provided", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ status: 200, body: {} }]);
  await updateSubscription.execute({ subscriptionId: "sub-1", enabled: false }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), `/apps/${APP_ID}/subscriptions/sub-1`);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.subscription, { enabled: false });
});
