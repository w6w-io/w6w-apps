import { assertEquals } from "@std/assert";
import taskList from "../../actions/task-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-list: POSTs filters to /tasks/list", async () => {
  const { ctx, calls } = mockCtx([{ body: { totalCount: 0, tasks: [] } }]);
  await taskList.execute({ status: 0, period: "today" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/api/tasks/list");
  assertEquals(JSON.parse(calls[0].body!), { status: 0, period: "today" });
});
