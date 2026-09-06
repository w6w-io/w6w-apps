import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-uncomplete.ts";

Deno.test("task-uncomplete: is idempotent per the spec's own PUT rule", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("task-uncomplete: PUTs status NotCompleted", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await action.execute({ workflowRunId: "run1", taskId: "t1" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { status: "NotCompleted" });
  assertEquals(out, { completed: false });
});

Deno.test("task-uncomplete: omitting dueDate leaves it out of the body (clears it)", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await action.execute({ workflowRunId: "run1", taskId: "t1" }, ctx);
  assertEquals("dueDate" in JSON.parse(calls[0].body!), false);
});
