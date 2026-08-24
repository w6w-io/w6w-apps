import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-superagents.ts";
import { mockConnectedCtx, mockCtx, pathOf, queryOf, WORKSPACE_ID } from "../_helpers.ts";

const PAGE = {
  superagents: [{ superagent_id: "agent1", superagent_name: "Support Agent" }],
  pagination: { total: 1, limit: 50, next_cursor: null, has_more: false },
};

Deno.test("list-superagents: maps the superagent inventory page", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: PAGE }]);
  const result = await action.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), `/api/v1/monitoring/${WORKSPACE_ID}/superagents`);
  assertEquals(result, {
    superagents: PAGE.superagents,
    total: 1,
    nextCursor: undefined,
    hasMore: false,
  });
});

Deno.test("list-superagents: passes filters through", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: PAGE }]);
  await action.execute({ search: "support", visibility: "workspace" }, ctx);
  assertEquals(queryOf(calls[0].url), { search: "support", visibility: "workspace" });
});

Deno.test("list-superagents: fails without a connected workspace", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "workspace id");
});
