import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-list: GETs /users", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [{ id: "user_1" }], page: {} } }]);
  const out = await userList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v1/users");
  assertEquals((out.items as unknown[]).length, 1);
});
