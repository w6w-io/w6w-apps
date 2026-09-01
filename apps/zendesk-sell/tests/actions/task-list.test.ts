import { assertEquals } from "@std/assert";
import taskList from "../../actions/task-list.ts";
import { listEnvelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("task-list: maps type/resourceType/completed filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  await taskList.execute({ type: "related", resourceType: "lead", completed: true }, ctx);
  assertEquals(queryOf(calls[0].url), {
    type: "related",
    resource_type: "lead",
    completed: "true",
  });
});
