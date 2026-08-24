import { assertEquals } from "@std/assert";
import bulkRunGet from "../../actions/bulk-run-get.ts";
import { mockCtx, pathOf, queryOf, resultEnvelope } from "../_helpers.ts";

const RESULT = {
  bulkRun: { id: "b1", status: "finished", tasksCount: 2, successfulTasks: 2, failedTasks: 0 },
  robotTasks: { totalCount: 2, pageNumber: 1, hasMore: false, items: [] },
};

Deno.test("bulk-run-get: GETs /robots/{robotId}/bulk-runs/{bulkRunId} and unwraps result", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: resultEnvelope(RESULT) }]);
  const out = await bulkRunGet.execute(
    { robotId: "r1", bulkRunId: "b1" },
    ctx,
  ) as typeof RESULT;

  assertEquals(pathOf(calls[0].url), "/v2/robots/r1/bulk-runs/b1");
  assertEquals(out.bulkRun.status, "finished");
  assertEquals(out.robotTasks.totalCount, 2);
});

Deno.test("bulk-run-get: page paginates the tasks inside the bulk run", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: resultEnvelope(RESULT) }]);
  await bulkRunGet.execute({ robotId: "r1", bulkRunId: "b1", page: 2 }, ctx);
  assertEquals(queryOf(calls[0].url), { page: "2" });
});
