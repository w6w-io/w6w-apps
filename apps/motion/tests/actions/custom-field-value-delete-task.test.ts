import { assertEquals } from "@std/assert";
import customFieldValueDeleteTask from "../../actions/custom-field-value-delete-task.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("custom-field-value-delete-task: DELETEs the value, not the definition", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await customFieldValueDeleteTask.execute({ taskId: "t1", valueId: "v1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/beta/custom-field-values/task/t1/custom-fields/v1");
  assertEquals(calls[0].body, null);
  assertEquals(out, { valueId: "v1", status: 204 });
});

/**
 * `valueId` is a third identifier for the same field: not the definition id that
 * the set-value action writes with, and not the field NAME a task's
 * `customFieldValues` record is keyed by.
 */
Deno.test("custom-field-value-delete-task: takes a value id, not a custom field id", () => {
  const keys = (customFieldValueDeleteTask.params ?? []).map((p) => p.key);
  assertEquals(keys, ["taskId", "valueId"]);
  assertEquals(customFieldValueDeleteTask.idempotent, true);
});
