import { assertEquals } from "@std/assert";
import taskList from "../../actions/task-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-list: GETs /v2/tasks with filter[] query keys", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: listEnvelope([{ id: "t1" }], "/v2/tasks"),
  }]);
  await taskList.execute(
    { filterJobId: "j1", filterStatus: "finished", filterOperation: "convert" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v2/tasks");
  assertEquals(queryOf(calls[0].url), {
    "filter[job_id]": "j1",
    "filter[status]": "finished",
    "filter[operation]": "convert",
  });
});
