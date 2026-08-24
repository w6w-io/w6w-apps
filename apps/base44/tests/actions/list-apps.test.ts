import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-apps.ts";
import { mockConnectedCtx, mockCtx, pathOf, queryOf, WORKSPACE_ID } from "../_helpers.ts";

const PAGE = {
  apps: [{ app_id: "app1", app_name: "Sales Dashboard" }],
  pagination: { total: 1, limit: 50, next_cursor: null, has_more: false },
};

Deno.test("list-apps: maps the app inventory page", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: PAGE }]);
  const result = await action.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), `/api/v1/monitoring/${WORKSPACE_ID}/apps`);
  assertEquals(result, { apps: PAGE.apps, total: 1, nextCursor: undefined, hasMore: false });
});

Deno.test("list-apps: passes filters through", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: PAGE }]);
  await action.execute({
    search: "dash",
    isPublished: false,
    visibility: "workspace",
    sort: "-views_last_30d",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    search: "dash",
    is_published: "false",
    visibility: "workspace",
    sort: "-views_last_30d",
  });
});

Deno.test("list-apps: fails without a connected workspace", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "workspace id");
});
