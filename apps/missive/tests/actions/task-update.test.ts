import { assertEquals } from "@std/assert";
import action from "../../actions/task-update.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-update: patches by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { tasks: { id: "t1", state: "closed" } } }]);
  const out = await action.execute({ id: "t1", state: "closed" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/tasks/t1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(out, { id: "t1", state: "closed" });
});

Deno.test("task-update: requires id", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ id: "" }, ctx));
});
