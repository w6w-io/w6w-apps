import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: GETs /users.info with user id and unwraps `user`", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, user: { id: "U1" } } }]);
  const result = await action.execute!({ user: "U1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/users.info");
  assertEquals(url.searchParams.get("user"), "U1");
  assertEquals(result, { id: "U1" });
});
