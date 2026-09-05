import { assertEquals } from "@std/assert";
import taskListMessages from "../../actions/task-list-messages.ts";
import { mockCtx, okBody, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-list-messages: maps has_more/next_cursor from the messages field onto items", async () => {
  const { ctx, calls } = mockCtx([{
    body: okBody({
      task_id: "t1",
      messages: [{ id: "e1", type: "assistant_message", timestamp: 1 }],
      has_more: true,
      next_cursor: "c2",
    }),
  }]);
  const out = await taskListMessages.execute({ taskId: "t1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/task.listMessages");
  assertEquals(queryOf(calls[0].url), { task_id: "t1" });
  assertEquals(out.items.length, 1);
  assertEquals(out.nextCursor, "c2");
});

Deno.test("task-list-messages: sends verbose and slidesFormat as documented query keys", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ task_id: "t1", messages: [] }) }]);
  await taskListMessages.execute({ taskId: "t1", verbose: true, slidesFormat: "pptx" }, ctx);
  assertEquals(queryOf(calls[0].url).verbose, "true");
  assertEquals(queryOf(calls[0].url).slides_format, "pptx");
});

Deno.test("task-list-messages: is a search action", () => {
  assertEquals(taskListMessages.type, "search");
});
