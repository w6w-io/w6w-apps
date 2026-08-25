import { assertEquals } from "@std/assert";
import taskUpdate from "../../actions/task-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-update: POSTs a JSON body without the taskKey field", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "task1" } }]);
  await taskUpdate.execute({ taskKey: "task1", status: "DONE" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/tasks/task1");
  assertEquals(JSON.parse(calls[0].body!), { status: "DONE" });
});

Deno.test("task-update: status is one of DONE / NOT_DONE", () => {
  const statusParam = taskUpdate.params!.find((p) => p.key === "status")!;
  const values = (statusParam.options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(values.sort(), ["DONE", "NOT_DONE"]);
});
