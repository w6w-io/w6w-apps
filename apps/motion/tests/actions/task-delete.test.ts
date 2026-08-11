import { assert, assertEquals } from "@std/assert";
import taskDelete from "../../actions/task-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-delete: DELETEs /v1/tasks/{id} and returns the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await taskDelete.execute({ id: "t1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/t1");
  // No body, so no content-type: Motion's header guard only fires on a
  // body-carrying request, and a DELETE reaches the router without it (measured).
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "t1", status: 204 });
});

/**
 * Motion's delete reference types the path parameter as `integer` while every id
 * the API returns is an opaque string, and the four other task endpoints
 * document it as a string. Coercing to a number — the reading the reference
 * invites — would fail on every real id.
 */
Deno.test("task-delete: the id is treated as the opaque string it really is", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await taskDelete.execute({ id: "cX9-abc_DEF" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/tasks/cX9-abc_DEF");
  assertEquals(taskDelete.params?.[0].type, "string");
});

Deno.test("task-delete: is idempotent", () => {
  assert(taskDelete.idempotent);
});
