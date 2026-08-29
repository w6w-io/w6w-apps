import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-list.ts";

Deno.test("task-list: from is required and sent as a query param", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { tasks: [{ id: "t1" }], lastId: "t1" } }]);
  const result = await action.execute!({ from: 1000 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/tasks/all");
  assertEquals(url.searchParams.get("from"), "1000");
  assertEquals((result as { tasks: unknown[] }).tasks.length, 1);
  assertEquals((result as { lastId: string }).lastId, "t1");
});

Deno.test("task-list: state is comma-joined from a CSV field", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { tasks: [] } }]);
  await action.execute!({ from: 1000, state: "1, 2" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("state"), "1,2");
});

Deno.test("task-list: from is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "from");
  assertEquals(calls.length, 0);
});

Deno.test("task-list: an absent lastId means the last page, and tasks defaults to empty", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute!({ from: 1000 }, ctx) as {
    tasks: unknown[];
    lastId?: string;
  };
  assertEquals(result.tasks, []);
  assertEquals(result.lastId, undefined);
});
