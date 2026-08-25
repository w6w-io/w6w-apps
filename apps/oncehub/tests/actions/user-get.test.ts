import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: GETs /users/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "USR-1" } }]);
  await action.execute({ id: "USR-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/users/USR-1");
});
