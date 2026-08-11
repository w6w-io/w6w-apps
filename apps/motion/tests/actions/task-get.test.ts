import { assertEquals, assertRejects } from "@std/assert";
import taskGet from "../../actions/task-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-get: calls GET /v1/tasks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1", name: "Draft" } }]);
  const out = await taskGet.execute({ id: "t1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/t1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, { id: "t1", name: "Draft" });
});

/** An id someone pastes with a slash must not address a different route. */
Deno.test("task-get: the id is path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await taskGet.execute({ id: "a/b?c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/tasks/a%2Fb%3Fc");
});

Deno.test("task-get: an error body is surfaced with Motion's own wording", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Task not found", statusCode: 404 } }]);
  await assertRejects(
    async () => {
      await taskGet.execute({ id: "nope" }, ctx);
    },
    Error,
    "Task not found",
  );
});
