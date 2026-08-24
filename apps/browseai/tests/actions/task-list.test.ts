import { assertEquals } from "@std/assert";
import taskList from "../../actions/task-list.ts";
import { mockCtx, pathOf, queryOf, resultEnvelope } from "../_helpers.ts";

const PAGE = { totalCount: 1, pageNumber: 1, hasMore: false, items: [{ id: "t1" }] };

Deno.test("task-list: GETs the robot's tasks and unwraps result.robotTasks", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: resultEnvelope({ robotTasks: PAGE }) }]);
  const out = await taskList.execute({ robotId: "r1" }, ctx) as typeof PAGE;

  assertEquals(pathOf(calls[0].url), "/v2/robots/r1/tasks");
  assertEquals(out.items[0].id, "t1");
  assertEquals(out.hasMore, false);
});

Deno.test("task-list: forwards every filter as a query param", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: resultEnvelope({ robotTasks: PAGE }) }]);
  await taskList.execute({
    robotId: "r1",
    page: 2,
    pageSize: 5,
    status: "successful",
    robotBulkRunId: "b1",
    sort: "-createdAt",
    includeRetried: false,
    fromDate: 1000,
    toDate: 2000,
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    page: "2",
    pageSize: "5",
    status: "successful",
    robotBulkRunId: "b1",
    sort: "-createdAt",
    includeRetried: "false",
    fromDate: "1000",
    toDate: "2000",
  });
});

Deno.test("task-list: pageSize is capped at Browse AI's documented ceiling of 10", () => {
  const p = taskList.params?.find((p) => p.key === "pageSize");
  assertEquals(p?.validation?.max, 10);
});

Deno.test("task-list: an omitted includeRetried is left off the query entirely", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: resultEnvelope({ robotTasks: PAGE }) }]);
  await taskList.execute({ robotId: "r1" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
