import { assertEquals } from "@std/assert";
import taskCancel from "../../actions/task-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-cancel: calls POST /1/task/cancel with objectID (the Task type itself)", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 0 } }]);
  await taskCancel.execute({ ids: "1,2" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/1/task/cancel");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.objectID, 1);
  assertEquals(body.ids, "1,2");
});
