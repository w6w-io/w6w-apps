import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-guild.ts";

Deno.test("get-guild: GETs /guilds/{id} without with_counts by default", async () => {
  const body = { id: "g1", name: "server" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ guildId: "g1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v10/guilds/g1");
  assert(!url.searchParams.has("with_counts"));
  assertEquals(result, body);
});

Deno.test("get-guild: forwards with_counts when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ guildId: "g1", withCounts: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("with_counts"), "true");
});
