import { assertEquals } from "@std/assert";
import action from "../../actions/user-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-list: lists users", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [{ id: "u1", me: true }] } }]);
  const out = await action.execute({ organization: "org-1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/users");
  assertEquals(out, [{ id: "u1", me: true }]);
});
