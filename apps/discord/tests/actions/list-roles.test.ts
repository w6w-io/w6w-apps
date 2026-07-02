import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-roles.ts";

Deno.test("list-roles: GETs /guilds/{id}/roles and wraps the result", async () => {
  const body = [{ id: "r1", name: "Admin" }];
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ guildId: "g1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v10/guilds/g1/roles");
  assertEquals(result, { roles: body });
});
