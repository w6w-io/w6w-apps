import { assertEquals } from "@std/assert";
import taskList from "../../actions/task-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-list: GETs /v1/tasks with pagination params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], totalItems: 0 } }]);
  await taskList.execute({ maxResults: 15, pageToken: "next" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/tasks");
  assertEquals(queryOf(calls[0].url).maxResults, "15");
  assertEquals(queryOf(calls[0].url).pageToken, "next");
});

Deno.test("task-list: is a search action", () => {
  assertEquals(taskList.type, "search");
});
