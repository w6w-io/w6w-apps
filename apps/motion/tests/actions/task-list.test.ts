import { assert, assertEquals } from "@std/assert";
import taskList from "../../actions/task-list.ts";
import { API_ROOT, mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-list: calls GET /v1/tasks and returns items plus the paging envelope", async () => {
  const { ctx, calls } = mockCtx([
    { body: page("tasks", [{ id: "t1" }], { nextCursor: "c2", pageSize: 1 }) },
  ]);
  const out = await taskList.execute({ workspaceId: "ws1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assert(calls[0].url.startsWith(`${API_ROOT}/v1/tasks`), calls[0].url);
  assertEquals(pathOf(calls[0].url), "/v1/tasks");
  assertEquals(queryOf(calls[0].url), { workspaceId: "ws1" });
  assertEquals(out, { items: [{ id: "t1" }], meta: { nextCursor: "c2", pageSize: 1 } });
});

/**
 * `false` is sent as absence rather than as the string "false": Motion publishes
 * no example request, and a naive handler reads the non-empty string "false" as
 * true. Off is the documented default, so absence is exactly right.
 */
Deno.test("task-list: includeAllStatuses is sent only when true", async () => {
  const on = mockCtx([{ body: page("tasks", []) }]);
  await taskList.execute({ includeAllStatuses: true }, on.ctx);
  assertEquals(queryOf(on.calls[0].url), { includeAllStatuses: "true" });

  const off = mockCtx([{ body: page("tasks", []) }]);
  await taskList.execute({ includeAllStatuses: false }, off.ctx);
  assertEquals(queryOf(off.calls[0].url), {});
});

Deno.test("task-list: every documented filter reaches the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: page("tasks", []) }]);
  await taskList.execute({
    workspaceId: "ws1",
    projectId: "p1",
    assigneeId: "u1",
    name: "draft",
    label: "Marketing",
    cursor: "c1",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    workspaceId: "ws1",
    projectId: "p1",
    assigneeId: "u1",
    name: "draft",
    label: "Marketing",
    cursor: "c1",
  });
});

/**
 * `status` is documented as `array<string>` and Motion publishes no example
 * request, so its wire encoding is unspecified — guessing returns the wrong set
 * of tasks silently rather than erroring. It is deliberately not offered.
 */
Deno.test("task-list: the undocumented-encoding status array is not exposed", () => {
  const keys = (taskList.params ?? []).map((p) => p.key);
  assert(!keys.includes("status"), "status filter exposed despite an unspecified encoding");
  assert(keys.includes("includeAllStatuses"));
});

Deno.test("task-list: a missing collection reads as an empty page, not undefined", async () => {
  const { ctx } = mockCtx([{ body: { meta: {} } }]);
  const out = await taskList.execute({}, ctx) as { items: unknown[] };
  assertEquals(out.items, []);
});
