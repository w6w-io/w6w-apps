import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

Deno.test("user-list: GETs /users", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { users: [] } }]);
  await action.execute({ view: "staff" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/users");
  assertEquals(url.searchParams.get("view"), "staff");
});
