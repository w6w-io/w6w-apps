import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-task.ts";

Deno.test("create-task: POSTs /crm/v3/objects/tasks defaulting status + type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await action.execute!({ hs_task_subject: "Call vendor" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/tasks");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.properties.hs_task_subject, "Call vendor");
  assertEquals(body.properties.hs_task_status, "NOT_STARTED");
  assertEquals(body.properties.hs_task_type, "TODO");
});
