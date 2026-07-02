import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-role.ts";

Deno.test("delete-role: DELETEs /guilds/{gid}/roles/{rid} and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ guildId: "g1", roleId: "r1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/v10/guilds/g1/roles/r1");
  assertEquals(result, { success: true });
});
