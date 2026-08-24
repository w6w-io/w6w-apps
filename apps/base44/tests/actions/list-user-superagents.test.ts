import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-user-superagents.ts";
import { mockConnectedCtx, mockCtx, pathOf, queryOf, WORKSPACE_ID } from "../_helpers.ts";

const PAGE = {
  superagent_ids: ["agent1"],
  pagination: { total: 1, limit: 50, next_cursor: null, has_more: false },
};

Deno.test("list-user-superagents: maps superagent ids and pagination", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: PAGE }]);
  const result = await action.execute({ userId: "u1" }, ctx);

  assertEquals(pathOf(calls[0].url), `/api/v1/monitoring/${WORKSPACE_ID}/users/u1/superagents`);
  assertEquals(result, {
    superagentIds: ["agent1"],
    total: 1,
    nextCursor: undefined,
    hasMore: false,
  });
});

Deno.test("list-user-superagents: passes visibility and active filters through", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: PAGE }]);
  await action.execute({ userId: "u1", visibility: "private", active: true }, ctx);
  assertEquals(queryOf(calls[0].url), { visibility: "private", active: "true" });
});

Deno.test("list-user-superagents: requires userId without making a request", async () => {
  const { ctx, calls } = mockConnectedCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "userId is required");
  assertEquals(calls.length, 0);
});

Deno.test("list-user-superagents: fails without a connected workspace", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ userId: "u1" }, ctx),
    Error,
    "workspace id",
  );
});
