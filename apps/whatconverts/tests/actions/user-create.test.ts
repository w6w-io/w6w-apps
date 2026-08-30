import { assertEquals } from "@std/assert";
import userCreate from "../../actions/user-create.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("user-create posts user_type and email at minimum", async () => {
  const responseBody = {
    user_id: 63752,
    user_type: "master_account_user",
    email: "me@example.com",
    pending_activation: true,
    date_created: "2026-08-19T18:18:02Z",
  };
  const { ctx, calls } = mockCtx([{ status: 200, body: responseBody }]);
  const out = await userCreate.execute(
    { userType: "master_account_user", email: "me@example.com" },
    ctx,
  );
  assertEquals(out, responseBody);
  assertEquals(calls[0].url, `${API_ROOT}/users`);
  assertEquals(JSON.parse(calls[0].body!), {
    user_type: "master_account_user",
    email: "me@example.com",
  });
});

Deno.test("user-create serializes nested notifications and accounts JSON params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await userCreate.execute({
    userType: "master_account_user",
    email: "me@example.com",
    roleId: 31425,
    newAccountNotifications: { reports: true, phone_calls: false },
    accounts: [{ account_id: 3865709, reports: true }],
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.role_id, 31425);
  assertEquals(body.new_account_notifications, { reports: true, phone_calls: false });
  assertEquals(body.accounts, [{ account_id: 3865709, reports: true }]);
});

Deno.test("user-create accepts accounts/new_account_notifications as JSON strings", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await userCreate.execute({
    userType: "account_user",
    email: "me@example.com",
    accounts: '[{"account_id":1,"role_id":2}]',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.accounts, [{ account_id: 1, role_id: 2 }]);
});
