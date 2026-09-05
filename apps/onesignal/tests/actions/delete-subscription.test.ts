import { assertEquals } from "@std/assert";
import deleteSubscription from "../../actions/delete-subscription.ts";
import { APP_ID, mockCtxWithConnection, pathOf } from "../_helpers.ts";

Deno.test("delete-subscription: DELETEs by id, reports deleted from the status", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ status: 202, body: {} }]);
  const out = await deleteSubscription.execute({ subscriptionId: "sub-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), `/apps/${APP_ID}/subscriptions/sub-1`);
  assertEquals(out, { deleted: true });
});
