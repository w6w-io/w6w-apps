import { assertEquals } from "@std/assert";
import createUser from "../../actions/create-user.ts";
import { APP_ID, mockCtxWithConnection, pathOf } from "../_helpers.ts";

Deno.test("create-user: nests identity/properties/subscriptions correctly", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ status: 200, body: { identity: {} } }]);
  await createUser.execute({
    externalId: "user_123",
    tags: '{"plan": "pro"}',
    subscriptions: '[{"type": "Email", "token": "a@example.com"}]',
  }, ctx);
  assertEquals(pathOf(calls[0].url), `/apps/${APP_ID}/users`);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.identity, { external_id: "user_123" });
  assertEquals(body.properties.tags, { plan: "pro" });
  assertEquals(body.subscriptions, [{ type: "Email", token: "a@example.com" }]);
});

Deno.test("create-user: omits identity entirely when no External ID is given", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ status: 200, body: {} }]);
  await createUser.execute({}, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("identity" in body, false);
});
