import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get-presence.ts";

Deno.test("user-get-presence: GETs /users.getPresence with user id", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, presence: "active" } }]);
  await action.execute!({ user: "U1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/users.getPresence");
  assertEquals(url.searchParams.get("user"), "U1");
});
