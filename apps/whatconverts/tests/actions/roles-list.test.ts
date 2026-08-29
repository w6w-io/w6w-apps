import { assertEquals } from "@std/assert";
import rolesList from "../../actions/roles-list.ts";
import { API_ROOT, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("roles-list defaults roles_per_page to 25", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { roles: [] } }]);
  await rolesList.execute({}, ctx);
  assertEquals(calls[0].url, `${API_ROOT}/roles?roles_per_page=25`);
});

Deno.test("roles-list forwards order and role_type filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { roles: [] } }]);
  await rolesList.execute({ order: "desc", roleType: "account" }, ctx);
  assertEquals(queryOf(calls[0].url), {
    roles_per_page: "25",
    order: "desc",
    role_type: "account",
  });
});
