import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-task.ts";

Deno.test("create-task: POSTs /tasks with { data: {...} } including workspace, name, and extras", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { gid: "t-1" } } }]);
  await action.execute({
    workspace: "ws-1",
    name: "hello",
    notes: "world",
    projects: ["p-1", "p-2"],
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/tasks");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent, {
    data: { workspace: "ws-1", name: "hello", notes: "world", projects: ["p-1", "p-2"] },
  });
});

Deno.test("create-task: drops empty projects array and undefined fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ workspace: "ws-1", name: "hello", projects: [] }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert(!("projects" in sent.data));
});
