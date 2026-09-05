import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/task-get.ts";

Deno.test("task-get: GETs /tasks/{id}", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "t1" } }]);
  await action.execute({ taskId: "t1" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/tasks/t1");
});
