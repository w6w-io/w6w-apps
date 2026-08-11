import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/user-role-set.ts";

Deno.test("user-role-set: the enum travels as a typed variable, not an interpolated literal", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { setUserRole: { is_admin: true } } } }]);
  await action.execute({ userId: "u1", role: "admin" }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("mutation SetUserRole($userId: String!, $role: Role!)"));
  assert(query.includes("setUserRole(user_id: $userId, role: $role)"));
  assertEquals(variables, { userId: "u1", role: "admin" });
});

Deno.test("user-role-set: offers exactly the two documented roles", () => {
  const opts = action.params!.find((p) => p.key === "role")!.options as Array<{ value: string }>;
  assertEquals(opts.map((o) => o.value), ["admin", "user"]);
});
