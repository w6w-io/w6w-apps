import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/task-create.ts";

/**
 * Pins the one place this API breaks its own "parent goes in the body"
 * pattern: task creation takes the project as a QUERY PARAM
 * (`POST /v2/tasks?project=:project`), confirmed at dev.freeagent.com/docs/tasks.
 * A body-only implementation (the pattern every other create action in this
 * app follows) would silently create a project-less task instead of failing.
 */
Deno.test("task-create: sends the project as a query param, not a body field", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ status: 201, body: { task: { url: "x" } } }]);
  await action.execute({ projectId: "1", name: "Sample Task", isBillable: true }, ctx);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/tasks");
  assertEquals(url.searchParams.get("project"), "https://api.freeagent.com/v2/projects/1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { task: { name: "Sample Task", is_billable: true } });
  assertEquals("project" in body.task, false, "project must not also be duplicated into the body");
});
