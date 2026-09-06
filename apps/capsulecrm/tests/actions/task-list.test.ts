import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-list.ts";

Deno.test("task-list: GETs /tasks with no status filter by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { tasks: [{ id: 530 }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.capsulecrm.com/api/v2/tasks");
  assertEquals(new URL(calls[0].url).searchParams.has("status"), false);
  assertEquals(out, { tasks: [{ id: 530 }], nextPage: undefined });
});

Deno.test("task-list: status is comma-joined so pending/completed tasks can be included", async () => {
  const { ctx, calls } = mockCtx([{ body: { tasks: [] } }]);
  await action.execute({ status: ["open", "pending"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("status"), "open,pending");
});
