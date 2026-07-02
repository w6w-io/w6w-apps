import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-task-comment.ts";

Deno.test("add-task-comment: POSTs plain text under { data: { text } }", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ id: "t-1", text: "hi" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/tasks/t-1/stories");
  assertEquals(JSON.parse(calls[0].body!), { data: { text: "hi" } });
});

Deno.test("add-task-comment: switches to html_text when isTextHtml=true", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ id: "t-1", text: "<b>hi</b>", isTextHtml: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { data: { html_text: "<b>hi</b>" } });
});

Deno.test("add-task-comment: forwards is_pinned when set", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ id: "t-1", text: "hi", is_pinned: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { data: { text: "hi", is_pinned: true } });
});
