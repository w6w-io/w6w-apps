import { assertEquals } from "@std/assert";
import taskList from "../../actions/task-list.ts";
import { mockCtx, pagedEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-list: GETs a board's tasks with the status filter", async () => {
  const { ctx, calls } = mockCtx([{ body: pagedEnvelope({ tasks: [{ id: "task_1" }] }) }]);
  const out = await taskList.execute({ taskBoardId: "tb_1", status: "published" }, ctx);
  assertEquals(pathOf(calls[0].url), "/tasks/v1/taskboards/tb_1/tasks");
  assertEquals(queryOf(calls[0].url), { status: "published" });
  assertEquals(out, { tasks: [{ id: "task_1" }], offset: 0 });
});

Deno.test("task-list: userIds is a repeated-key array filter", async () => {
  const { ctx, calls } = mockCtx([{ body: pagedEnvelope({ tasks: [] }) }]);
  await taskList.execute({ taskBoardId: "tb_1", userIds: "1,2" }, ctx);
  assertEquals(queryOf(calls[0].url).userIds, ["1", "2"]);
});
