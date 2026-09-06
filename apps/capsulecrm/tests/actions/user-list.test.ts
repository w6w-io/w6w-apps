import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

Deno.test("user-list: GETs /users", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [{ id: 1, username: "scott" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.capsulecrm.com/api/v2/users");
  assertEquals(out, { users: [{ id: 1, username: "scott" }] });
});
