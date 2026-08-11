import { assertEquals } from "@std/assert";
import taskRunSyncGetItems from "../../actions/task-run-sync-get-items.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-run-sync-get-items: reads a bare array response, not an envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: [{ url: "a" }] }]);
  const out = await taskRunSyncGetItems.execute({ taskId: "t1", limit: 100 }, ctx) as {
    items: unknown[];
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/actor-tasks/t1/run-sync-get-dataset-items");
  assertEquals(out.items, [{ url: "a" }]);
});

Deno.test("task-run-sync-get-items: sends no body when there is nothing to override", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: [] }]);
  await taskRunSyncGetItems.execute({ taskId: "t1" }, ctx);
  assertEquals(calls[0].body, null);
});

Deno.test("task-run-sync-get-items: run options and item shaping share the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: [] }]);
  await taskRunSyncGetItems.execute(
    { taskId: "t1", build: "beta", limit: 3, clean: true, view: "overview" },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    build: "beta",
    limit: "3",
    clean: "1",
    view: "overview",
  });
});

Deno.test("task-run-sync-get-items: is declared non-idempotent", () => {
  assertEquals(taskRunSyncGetItems.idempotent, false);
});
