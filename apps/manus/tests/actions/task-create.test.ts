import { assertEquals } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { API_ROOT, mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("task-create: posts to /v2/task.create with only the fields the caller set", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ task_id: "t1" }) }]);
  await taskCreate.execute({ content: "Do the thing" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/task.create");
  assertEquals(calls[0].url, `${API_ROOT}/v2/task.create`);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { message: { content: "Do the thing" } });
});

Deno.test("task-create: maps camelCase params onto Manus's snake_case body fields", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ task_id: "t1" }) }]);
  await taskCreate.execute({
    content: "Ship it",
    title: "My task",
    projectId: "proj-1",
    locale: "en",
    interactiveMode: true,
    hideInTaskList: true,
    shareVisibility: "team",
    agentProfile: "max",
    connectors: ["gmail"],
    enableSkills: "skill-1,skill-2",
    forceSkills: ["skill-3"],
    taskReferences: ["a".repeat(22)],
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    message: {
      content: "Ship it",
      connectors: ["gmail"],
      enable_skills: ["skill-1", "skill-2"],
      force_skills: ["skill-3"],
      task_references: ["a".repeat(22)],
    },
    project_id: "proj-1",
    locale: "en",
    interactive_mode: true,
    hide_in_task_list: true,
    share_visibility: "team",
    agent_profile: "max",
    title: "My task",
  });
});

Deno.test("task-create: a file attachment builds a text + file content array", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ task_id: "t1" }) }]);
  await taskCreate.execute({ content: "Read this", fileId: "file-1" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.message.content, [
    { type: "text", text: "Read this" },
    { type: "file", file_id: "file-1" },
  ]);
});

Deno.test("task-create: returns the create response verbatim", async () => {
  const { ctx } = mockCtx([{ body: okBody({ task_id: "t1", task_title: "Hi" }) }]);
  const out = await taskCreate.execute({ content: "hi" }, ctx);
  assertEquals(out.task_id, "t1");
  assertEquals(out.task_title, "Hi");
});

Deno.test("task-create: is not idempotent — every retry starts a new billed task", () => {
  assertEquals(taskCreate.idempotent, false);
});

Deno.test("task-create: requires content", () => {
  const content = taskCreate.params?.find((p) => p.key === "content");
  assertEquals(content?.required, true);
});
