import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-user.ts";
import { mockConnectedCtx, mockCtx, pathOf, WORKSPACE_ID } from "../_helpers.ts";

const USER = {
  user_id: "u1",
  email: "jane@acme.com",
  created_at: "2026-01-01T00:00:00Z",
  is_active: true,
  role: "member",
  total_apps: 3,
  total_superagents: 0,
  active_last_30d: true,
  total_message_credits: 10,
  total_integration_credits: 2,
  total_credits: 12,
  member_allocation: null,
};

Deno.test("get-user: maps the user record", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: USER }]);
  const result = await action.execute!({ userId: "u1" }, ctx) as {
    userId: string;
    email: string;
    memberAllocation: unknown;
  };

  assertEquals(pathOf(calls[0].url), `/api/v1/monitoring/${WORKSPACE_ID}/users/u1`);
  assertEquals(result.userId, "u1");
  assertEquals(result.email, "jane@acme.com");
  assertEquals(result.memberAllocation, null);
});

Deno.test("get-user: requires userId without making a request", async () => {
  const { ctx, calls } = mockConnectedCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "userId is required");
  assertEquals(calls.length, 0);
});

Deno.test("get-user: encodes the user id in the path", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: USER }]);
  await action.execute({ userId: "u/weird id" }, ctx);
  assertEquals(pathOf(calls[0].url), `/api/v1/monitoring/${WORKSPACE_ID}/users/u%2Fweird%20id`);
});

Deno.test("get-user: fails without a connected workspace", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ userId: "u1" }, ctx),
    Error,
    "workspace id",
  );
});
