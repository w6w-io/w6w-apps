import { assertEquals } from "@std/assert";
import createSubscription from "../../actions/create-subscription.ts";
import { APP_ID, mockCtxWithConnection, pathOf } from "../_helpers.ts";

Deno.test("create-subscription: nests type/token under `subscription`, path targets the alias", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ status: 200, body: { subscription: {} } }]);
  await createSubscription.execute(
    { aliasId: "user_123", type: "Email", token: "a@example.com", enabled: true },
    ctx,
  );
  assertEquals(
    pathOf(calls[0].url),
    `/apps/${APP_ID}/users/by/external_id/user_123/subscriptions`,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.subscription, { type: "Email", token: "a@example.com", enabled: true });
});
