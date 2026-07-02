import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-channel.ts";

Deno.test("update-channel: PATCHes /channels/{id} with only supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await action.execute!({ channelId: "c1", name: "renamed" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/api/v10/channels/c1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "renamed");
  assert(!("topic" in body), "undefined optional fields must not be forwarded");
});

Deno.test("update-channel: maps camelCase to Discord's snake_case body keys", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await action.execute!(
    { channelId: "c1", userLimit: 10, parentId: "cat", rateLimitPerUser: 5, nsfw: true },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.user_limit, 10);
  assertEquals(body.parent_id, "cat");
  assertEquals(body.rate_limit_per_user, 5);
  assertEquals(body.nsfw, true);
});
