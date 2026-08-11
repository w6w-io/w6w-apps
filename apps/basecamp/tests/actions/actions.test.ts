import { assert, assertEquals, assertRejects } from "@std/assert";
import projectList from "../../actions/project-list.ts";
import projectGet from "../../actions/project-get.ts";
import peopleList from "../../actions/people-list.ts";
import todoList from "../../actions/todo-list.ts";
import todoGet from "../../actions/todo-get.ts";
import todoCreate from "../../actions/todo-create.ts";
import todoComplete from "../../actions/todo-complete.ts";
import messageList from "../../actions/message-list.ts";
import messageCreate from "../../actions/message-create.ts";
import commentCreate from "../../actions/comment-create.ts";
import campfireLineCreate from "../../actions/campfire-line-create.ts";
import { ACCOUNT_ID, mockBasecampCtx } from "../_helpers.ts";

/** Every path is prefixed with the account id — that is Basecamp's URL shape. */
Deno.test("project-list: builds an account-prefixed path", async () => {
  const { ctx, calls } = mockBasecampCtx([{ body: [] }]);
  await projectList.execute({ status: "archived", page: 2 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, `/${ACCOUNT_ID}/projects.json`);
  assertEquals(url.searchParams.get("status"), "archived");
  assertEquals(url.searchParams.get("page"), "2");
});

Deno.test("project-get and people-list: build their paths", async () => {
  const { ctx, calls } = mockBasecampCtx([{ body: {} }, { body: [] }]);
  await projectGet.execute({ projectId: "123" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, `/${ACCOUNT_ID}/projects/123.json`);
  await peopleList.execute({}, ctx);
  assertEquals(new URL(calls[1].url).pathname, `/${ACCOUNT_ID}/people.json`);
});

/** Flat routes: a to-do is addressed by its own id, with no project in the URL. */
Deno.test("todo-get: uses the flat route, not the legacy bucket form", async () => {
  const { ctx, calls } = mockBasecampCtx([{ body: { id: 67890 } }]);
  await todoGet.execute({ todoId: "67890" }, ctx);
  const path = new URL(calls[0].url).pathname;
  assertEquals(path, `/${ACCOUNT_ID}/todos/67890.json`);
  assert(!path.includes("/buckets/"), "the legacy project-scoped form is not used");
});

/**
 * Completed to-dos are excluded by default and the flag *replaces* the set —
 * there is no "both", which is why the hint says two calls are needed.
 */
Deno.test("todo-list: sends the completed flag only when asked", async () => {
  const { ctx, calls } = mockBasecampCtx([{ body: [] }, { body: [] }]);
  await todoList.execute({ todolistId: "456" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, `/${ACCOUNT_ID}/todolists/456/todos.json`);
  assertEquals(new URL(calls[0].url).searchParams.get("completed"), null);
  await todoList.execute({ todolistId: "456", completed: true }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("completed"), "true");
});

Deno.test("todo-create: posts content and maps the assignee ids to numbers", async () => {
  const { ctx, calls } = mockBasecampCtx([{ status: 201, body: { id: 1 } }]);
  await todoCreate.execute({
    todolistId: "456",
    content: "Ship the thing",
    description: "<div>with detail</div>",
    assigneeIds: "11, 22",
    dueOn: "2026-09-01",
    notify: true,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, `/${ACCOUNT_ID}/todolists/456/todos.json`);
  assertEquals(JSON.parse(calls[0].body!), {
    content: "Ship the thing",
    description: "<div>with detail</div>",
    assignee_ids: [11, 22],
    notify: true,
    due_on: "2026-09-01",
  });
});

Deno.test("todo-create: refuses a non-numeric assignee before sending", async () => {
  const { ctx, calls } = mockBasecampCtx([]);
  await assertRejects(
    async () => {
      await todoCreate.execute(
        { todolistId: "456", content: "x", assigneeIds: "ada@example.com" },
        ctx,
      );
    },
    Error,
    "is not an id",
  );
  assertEquals(calls.length, 0, "Basecamp has no assign-by-email; nothing should be sent");
});

/** Completion is a sub-resource: POST completes, DELETE reopens. */
Deno.test("todo-complete: POSTs to complete and DELETEs to reopen", async () => {
  const { ctx, calls } = mockBasecampCtx([{ status: 204 }, { status: 204 }]);
  await todoComplete.execute({ todoId: "67890" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, `/${ACCOUNT_ID}/todos/67890/completion.json`);
  await todoComplete.execute({ todoId: "67890", completed: false }, ctx);
  assertEquals(calls[1].method, "DELETE");
  assertEquals(new URL(calls[1].url).pathname, `/${ACCOUNT_ID}/todos/67890/completion.json`);
});

Deno.test("message-list: builds the board-scoped path", async () => {
  const { ctx, calls } = mockBasecampCtx([{ body: [] }]);
  await messageList.execute({ boardId: "789" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, `/${ACCOUNT_ID}/message_boards/789/messages.json`);
});

/**
 * The default that matters most here: Basecamp saves a message as an unseen
 * draft unless `status` says otherwise, so this app publishes by default.
 */
Deno.test("message-create: publishes by default rather than leaving a silent draft", async () => {
  const { ctx, calls } = mockBasecampCtx([{ status: 201, body: { id: 1 } }]);
  await messageCreate.execute({ boardId: "789", subject: "Deploy done" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { subject: "Deploy done", status: "active" });
});

Deno.test("message-create: an explicit draft is honoured", async () => {
  const { ctx, calls } = mockBasecampCtx([{ status: 201, body: {} }]);
  await messageCreate.execute(
    { boardId: "789", subject: "Later", content: "<p>hi</p>", status: "draft" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    subject: "Later",
    content: "<p>hi</p>",
    status: "draft",
  });
});

/** One endpoint comments on any recording — message, to-do, document or upload. */
Deno.test("comment-create: posts to the generic recordings path", async () => {
  const { ctx, calls } = mockBasecampCtx([{ status: 201, body: { id: 5 } }]);
  await commentCreate.execute({ recordingId: "123", content: "<p>looks good</p>" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, `/${ACCOUNT_ID}/recordings/123/comments.json`);
  assertEquals(JSON.parse(calls[0].body!), { content: "<p>looks good</p>" });
});

Deno.test("campfire-line-create: posts a line to the chat room", async () => {
  const { ctx, calls } = mockBasecampCtx([{ status: 201, body: { id: 9 } }]);
  await campfireLineCreate.execute({ campfireId: "321", content: "build green" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, `/${ACCOUNT_ID}/chats/321/lines.json`);
  assertEquals(JSON.parse(calls[0].body!), { content: "build green" });
});

Deno.test("actions: a rate limit surfaces the window and the wait", async () => {
  const { ctx } = mockBasecampCtx([{
    status: 429,
    body: { error: "Too many requests" },
    headers: { "content-type": "application/json", "retry-after": "5" },
  }]);
  const err = await assertRejects(async () => {
    await projectList.execute({}, ctx);
  }, Error);
  assert(err.message.includes("50 requests per 10 seconds"), err.message);
  assert(err.message.includes("Retry after 5s"), err.message);
});

/** With flat routes a 404 is as often an access problem as a missing id. */
Deno.test("actions: a 404 raises the access explanation", async () => {
  const { ctx } = mockBasecampCtx([{ status: 404, body: "" }]);
  const err = await assertRejects(async () => {
    await todoGet.execute({ todoId: "1" }, ctx);
  }, Error);
  assert(err.message.includes("may not have access"), err.message);
});
