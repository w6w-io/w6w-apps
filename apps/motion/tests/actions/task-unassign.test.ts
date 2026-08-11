import { assertEquals } from "@std/assert";
import taskUnassign from "../../actions/task-unassign.ts";
import taskUpdate from "../../actions/task-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-unassign: DELETEs /v1/tasks/{id}/assignee", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await taskUnassign.execute({ id: "t1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/t1/assignee");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "t1", status: 204 });
});

/**
 * The reason this endpoint has to exist: `assigneeId` on the update call is a
 * string, and omitting it means "leave it alone" — the client drops unset fields
 * rather than sending a null, so there is no way to clear an assignee through
 * an update.
 */
Deno.test("task-unassign: update cannot express an empty assignee, which is why this exists", () => {
  const assignee = taskUpdate.params?.find((p) => p.key === "assigneeId");
  assertEquals(assignee?.type, "string");
  assertEquals(taskUnassign.idempotent, true);
});
