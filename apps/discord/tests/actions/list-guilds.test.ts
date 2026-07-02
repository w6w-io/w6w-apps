import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-guilds.ts";

Deno.test("list-guilds: GETs /users/@me/guilds with default limit=100", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v10/users/@me/guilds");
  assertEquals(url.searchParams.get("limit"), "100");
});

Deno.test("list-guilds: forwards before/after cursors and wraps under `guilds`", async () => {
  const body = [{ id: "g1", name: "server" }];
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ limit: 10, before: "b", after: "a" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("before"), "b");
  assertEquals(params.get("after"), "a");
  assertEquals(params.get("limit"), "10");
  assertEquals(result, { guilds: body });
});
