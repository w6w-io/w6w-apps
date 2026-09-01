import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: GETs /users/:id", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { user: { url: "x" } } }]);
  await action.execute({ userId: "1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/users/1");
});
