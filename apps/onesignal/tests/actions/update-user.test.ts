import { assertEquals } from "@std/assert";
import updateUser from "../../actions/update-user.ts";
import { APP_ID, mockCtxWithConnection, pathOf } from "../_helpers.ts";

Deno.test("update-user: PATCHes properties and deltas separately", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ status: 202, body: { properties: {} } }]);
  await updateUser.execute({
    aliasId: "user_123",
    tags: '{"plan": "pro"}',
    deltas: '{"session_count": 1}',
  }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), `/apps/${APP_ID}/users/by/external_id/user_123`);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.properties.tags, { plan: "pro" });
  assertEquals(body.deltas, { session_count: 1 });
});
