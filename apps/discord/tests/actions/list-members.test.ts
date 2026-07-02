import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-members.ts";

Deno.test("list-members: GETs /guilds/{id}/members with default limit=100", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute!({ guildId: "g1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v10/guilds/g1/members");
  assertEquals(url.searchParams.get("limit"), "100");
  assert(!url.searchParams.has("after"));
});

Deno.test("list-members: forwards limit + after cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute!({ guildId: "g1", limit: 25, after: "user-1" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("limit"), "25");
  assertEquals(params.get("after"), "user-1");
});

Deno.test("list-members: wraps the response under `members`", async () => {
  const body = [{ user: { id: "u1" } }];
  const { ctx } = mockCtx([{ body }]);
  const result = await action.execute!({ guildId: "g1" }, ctx);
  assertEquals(result, { members: body });
});
