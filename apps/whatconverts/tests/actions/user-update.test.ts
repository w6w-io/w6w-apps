import { assertEquals } from "@std/assert";
import userUpdate from "../../actions/user-update.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("user-update posts to /users with user_id in the body, not the path", async () => {
  const responseBody = { user_id: 31425, email: "my_email_address@my_domain.com", accounts: [] };
  const { ctx, calls } = mockCtx([{ status: 200, body: responseBody }]);
  const out = await userUpdate.execute({ userId: 31425, roleId: 271 }, ctx);
  assertEquals(out, responseBody);
  assertEquals(calls[0].url, `${API_ROOT}/users`);
  assertEquals(JSON.parse(calls[0].body!), { user_id: 31425, role_id: 271 });
});

Deno.test("user-update revokes an account via role_id: false in the accounts JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await userUpdate.execute({
    userId: 31425,
    accounts: [{ account_id: 3865800, role_id: false }],
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.accounts, [{ account_id: 3865800, role_id: false }]);
});
