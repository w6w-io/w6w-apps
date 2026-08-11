import { assert, assertEquals } from "@std/assert";
import taskUpdate from "../../actions/task-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-update: PATCHes /v1/tasks/{id} with content-type set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await taskUpdate.execute(
    { id: "t1", name: "Draft", workspaceId: "ws1", status: "In Progress" },
    ctx,
  );

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/t1");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), { name: "Draft", workspaceId: "ws1", status: "In Progress" });
});

/**
 * Motion's update reference documents the FULL create body, with `name` and
 * `workspaceId` marked required — so this is not a sparse patch, and declaring
 * those two optional would produce requests the documentation says are invalid.
 */
Deno.test("task-update: name and workspaceId are required, as Motion's reference documents", () => {
  const byKey = Object.fromEntries((taskUpdate.params ?? []).map((p) => [p.key, p]));
  assertEquals(byKey.id?.required, true);
  assertEquals(byKey.name?.required, true);
  assertEquals(byKey.workspaceId?.required, true);
  // Everything else stays optional.
  for (const p of taskUpdate.params ?? []) {
    if (["id", "name", "workspaceId"].includes(p.key)) continue;
    assert(!p.required, `${p.key} should not be required`);
  }
});

/**
 * `autoScheduled: null` is the ONLY way to turn Motion's scheduler off for an
 * existing task, so an explicit null must survive to the wire while an unset
 * field must not appear at all. Collapsing the two would make the feature
 * unreachable.
 */
Deno.test("task-update: an explicit null autoScheduled is sent; an unset one is omitted", async () => {
  const off = mockCtx([{ body: {} }]);
  await taskUpdate.execute(
    { id: "t1", name: "n", workspaceId: "ws1", autoScheduled: null },
    off.ctx,
  );
  const sent = bodyOf(off.calls[0]) as Record<string, unknown>;
  assert("autoScheduled" in sent, "explicit null was dropped — auto-scheduling cannot be disabled");
  assertEquals(sent.autoScheduled, null);

  const untouched = mockCtx([{ body: {} }]);
  await taskUpdate.execute({ id: "t1", name: "n", workspaceId: "ws1" }, untouched.ctx);
  assert(!("autoScheduled" in (bodyOf(untouched.calls[0]) as Record<string, unknown>)));
});

/** A full restatement of the task is safe to repeat, which is what idempotent licenses. */
Deno.test("task-update: is idempotent", () => {
  assertEquals(taskUpdate.idempotent, true);
});
