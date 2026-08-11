import { assertEquals } from "@std/assert";
import recurringTaskDelete from "../../actions/recurring-task-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("recurring-task-delete: DELETEs /v1/recurring-tasks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await recurringTaskDelete.execute({ id: "r1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/recurring-tasks/r1");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "r1", status: 204 });
});

/** As with tasks, the reference types this as `integer`; real ids are strings. */
Deno.test("recurring-task-delete: the id is treated as an opaque string", () => {
  assertEquals(recurringTaskDelete.params?.[0].type, "string");
  assertEquals(recurringTaskDelete.idempotent, true);
});
