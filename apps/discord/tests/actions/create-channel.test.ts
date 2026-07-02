import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-channel.ts";

Deno.test("create-channel: POSTs /guilds/{id}/channels with name + default type=0", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "chan-1" } }]);
  await action.execute!({ guildId: "g1", name: "new-channel" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v10/guilds/g1/channels");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "new-channel");
  assertEquals(body.type, 0);
});

Deno.test("create-channel: forwards optional fields with snake_case keys", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "chan-2" } }]);
  await action.execute!(
    {
      guildId: "g1",
      name: "voice",
      type: 2,
      topic: "hello",
      bitrate: 64000,
      userLimit: 5,
      parentId: "cat-1",
      position: 3,
      rateLimitPerUser: 10,
      nsfw: true,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, 2);
  assertEquals(body.topic, "hello");
  assertEquals(body.bitrate, 64000);
  assertEquals(body.user_limit, 5);
  assertEquals(body.parent_id, "cat-1");
  assertEquals(body.position, 3);
  assertEquals(body.rate_limit_per_user, 10);
  assertEquals(body.nsfw, true);
});
