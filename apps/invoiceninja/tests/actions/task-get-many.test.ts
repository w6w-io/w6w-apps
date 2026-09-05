import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/task-get-many.ts";

Deno.test("task-get-many: GETs /tasks with pagination only", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { data: [] } }]);
  await action.execute({ page: 2, perPage: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/tasks");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "5");
});
