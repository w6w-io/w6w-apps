import { assertEquals } from "@std/assert";
import taskMove from "../../actions/task-move.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-move: PATCHes /v1/tasks/{id}/move with the destination workspace", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await taskMove.execute({ id: "t1", workspaceId: "ws2" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/t1/move");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), { workspaceId: "ws2" });
});

/** An assignee is workspace-scoped, which is why this endpoint takes a new one. */
Deno.test("task-move: an assignee can be set in the same request", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await taskMove.execute({ id: "t1", workspaceId: "ws2", assigneeId: "u9" }, ctx);
  assertEquals(bodyOf(calls[0]), { workspaceId: "ws2", assigneeId: "u9" });
});

Deno.test("task-move: is idempotent", () => {
  assertEquals(taskMove.idempotent, true);
});
