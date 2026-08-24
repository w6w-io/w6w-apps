import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-tasks.ts";

Deno.test("list-tasks: is a search action", () => {
  assertEquals(action.type, "search");
});

Deno.test("list-tasks: GETs /tasks with mapped filters and pagination", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { tasks: [] } }]);
  await action.execute({
    resourceId: 1,
    resourceType: "Contact",
    assignedTo: 2,
    completed: true,
    taskType: "parents",
    page: 1,
    perPage: 25,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/tasks");
  assertEquals(url.searchParams.get("resource_id"), "1");
  assertEquals(url.searchParams.get("resource_type"), "Contact");
  assertEquals(url.searchParams.get("assigned_to"), "2");
  assertEquals(url.searchParams.get("completed"), "true");
  assertEquals(url.searchParams.get("task_type"), "parents");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.get("per_page"), "25");
});
