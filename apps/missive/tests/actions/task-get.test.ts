import { assertEquals } from "@std/assert";
import action from "../../actions/task-get.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-get: fetches by id, returns the documented bare object", async () => {
  const { ctx, calls } = mockCtx([{ body: { tasks: { id: "t1", assignees: [{ id: "u1" }] } } }]);
  const out = await action.execute({ id: "t1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/tasks/t1");
  assertEquals(out, { id: "t1", assignees: [{ id: "u1" }] });
});

Deno.test("task-get: requires id", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ id: "" }, ctx));
});
