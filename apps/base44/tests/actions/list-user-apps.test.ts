import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-user-apps.ts";
import { mockConnectedCtx, mockCtx, pathOf, queryOf, WORKSPACE_ID } from "../_helpers.ts";

const PAGE = {
  app_ids: ["app1", "app2"],
  pagination: { total: 2, limit: 50, next_cursor: null, has_more: false },
};

Deno.test("list-user-apps: maps app ids and pagination", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: PAGE }]);
  const result = await action.execute({ userId: "u1" }, ctx);

  assertEquals(pathOf(calls[0].url), `/api/v1/monitoring/${WORKSPACE_ID}/users/u1/apps`);
  assertEquals(result, {
    appIds: ["app1", "app2"],
    total: 2,
    nextCursor: undefined,
    hasMore: false,
  });
});

Deno.test("list-user-apps: passes filters through", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 200, body: PAGE }]);
  await action.execute(
    { userId: "u1", isPublished: true, visibility: "public", active: false },
    ctx,
  );

  assertEquals(queryOf(calls[0].url).is_published, "true");
  assertEquals(queryOf(calls[0].url).visibility, "public");
  assertEquals(queryOf(calls[0].url).active, "false");
});

Deno.test("list-user-apps: requires userId without making a request", async () => {
  const { ctx, calls } = mockConnectedCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "userId is required");
  assertEquals(calls.length, 0);
});

Deno.test("list-user-apps: fails without a connected workspace", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ userId: "u1" }, ctx),
    Error,
    "workspace id",
  );
});
