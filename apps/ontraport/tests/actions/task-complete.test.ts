import { assertEquals } from "@std/assert";
import taskComplete from "../../actions/task-complete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-complete: calls POST /1/task/complete with numeric ids and optional data", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 0 } }]);
  await taskComplete.execute({ taskIds: "3", data: { outcome: ":=success" } }, ctx);

  assertEquals(pathOf(calls[0].url), "/1/task/complete");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.object_type_id, 0);
  assertEquals(body.ids, [3]);
  assertEquals(body.data, { outcome: ":=success" });
});

Deno.test("task-complete: accepts a JSON string for data, not just an object", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 0 } }]);
  await taskComplete.execute({ taskIds: "3", data: '{"outcome": ":=success"}' }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data, { outcome: ":=success" });
});
