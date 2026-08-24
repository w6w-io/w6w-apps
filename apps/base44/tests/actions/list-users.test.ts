import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-users.ts";
import { mockConnectedCtx, mockCtx, pathOf, queryOf, WORKSPACE_ID } from "../_helpers.ts";

const PAGE = {
  users: [{ user_id: "u1", email: "a@b.com" }],
  pagination: { total: 1, limit: 50, next_cursor: null, has_more: false },
};

Deno.test("list-users: maps the users page and pagination", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: PAGE }]);
  const result = await action.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), `/api/v1/monitoring/${WORKSPACE_ID}/users`);
  assertEquals(result, { users: PAGE.users, total: 1, nextCursor: undefined, hasMore: false });
});

Deno.test("list-users: passes filters and booleans through as documented flags", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: PAGE }]);
  await action.execute({
    limit: 10,
    cursor: "cur1",
    activeOnly: true,
    tier: "enterprise",
    overMemberLimit: true,
    sort: "-total_credits",
    search: "jane",
    role: "admin",
    isActive: false,
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    limit: "10",
    cursor: "cur1",
    active_only: "true",
    tier: "enterprise",
    over_member_limit: "true",
    sort: "-total_credits",
    search: "jane",
    role: "admin",
    is_active: "false",
  });
});

Deno.test("list-users: a false boolean filter is sent, not dropped as falsy", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: PAGE }]);
  await action.execute({ isActive: false }, ctx);
  assertEquals(queryOf(calls[0].url).is_active, "false");
});

Deno.test("list-users: an omitted flag is absent, not sent as false", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: PAGE }]);
  await action.execute({}, ctx);
  assertEquals("active_only" in queryOf(calls[0].url), false);
  assertEquals("is_active" in queryOf(calls[0].url), false);
});

Deno.test("list-users: reports the next cursor when present", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 200,
    body: { users: [], pagination: { total: 100, limit: 50, next_cursor: "abc", has_more: true } },
  }]);
  const result = await action.execute!({}, ctx) as { nextCursor?: string; hasMore: boolean };
  assertEquals(result.nextCursor, "abc");
  assertEquals(result.hasMore, true);
});

Deno.test("list-users: fails without a connected workspace", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "workspace id");
});
