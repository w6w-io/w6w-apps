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

Deno.test("create-task: new params are keyed exactly as Asana spells the field (the wholesale forward relies on it)", () => {
  const declared = new Set(action.params?.map((p) => p.key));
  for (const k of ["custom_fields", "followers", "html_notes", "start_on", "due_at"]) {
    assert(declared.has(k), `expected a param declared with key "${k}"`);
  }
});

Deno.test("create-task: forwards custom_fields/followers/html_notes/start_on/due_at verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({
    workspace: "ws-1",
    name: "hello",
    custom_fields: { "1231": "some value" },
    followers: ["u-1", "u-2"],
    html_notes: "<body>hi</body>",
    start_on: "2026-07-01",
    due_at: "2026-07-02T10:00:00.000Z",
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(
    Object.keys(sent.data).sort(),
    ["custom_fields", "due_at", "followers", "html_notes", "name", "start_on", "workspace"],
  );
  assertEquals(sent.data.custom_fields, { "1231": "some value" });
  assertEquals(sent.data.followers, ["u-1", "u-2"]);
  assertEquals(sent.data.html_notes, "<body>hi</body>");
  assertEquals(sent.data.start_on, "2026-07-01");
  assertEquals(sent.data.due_at, "2026-07-02T10:00:00.000Z");
});
