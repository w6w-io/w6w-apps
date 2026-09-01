import { assertEquals } from "@std/assert";
import { DEFAULT_DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/view-list-for-site.ts";

Deno.test("view-list-for-site: includeUsageStatistics reaches the query string", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { views: { view: [] } } }],
    { display: DEFAULT_DISPLAY },
  );
  await action.execute!({ includeUsageStatistics: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("includeUsageStatistics"), "true");
  assertEquals(new URL(calls[0].url).pathname, "/api/3.21/sites/site-1/views");
});

Deno.test("view-list-for-site: a single view is unwrapped into a 1-element array", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: { views: { view: { id: "v1" } } } }],
    { display: DEFAULT_DISPLAY },
  );
  const result = await action.execute!({}, ctx) as { views: unknown[] };
  assertEquals(result.views, [{ id: "v1" }]);
});
