import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-tasks.ts";

Deno.test("list-tasks: GETs /tasks with default limit=100", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/tasks");
  assertEquals(url.searchParams.get("limit"), "100");
});

Deno.test("list-tasks: forwards all optional filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({
    assignee: "u-1",
    workspace: "ws-1",
    project: "p-1",
    section: "s-1",
    completed_since: "2024-01-01T00:00:00Z",
    modified_since: "2024-06-01T00:00:00Z",
    opt_fields: "gid",
    limit: 10,
    offset: "cur",
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("assignee"), "u-1");
  assertEquals(p.get("workspace"), "ws-1");
  assertEquals(p.get("project"), "p-1");
  assertEquals(p.get("section"), "s-1");
  assertEquals(p.get("completed_since"), "2024-01-01T00:00:00Z");
  assertEquals(p.get("modified_since"), "2024-06-01T00:00:00Z");
  assertEquals(p.get("opt_fields"), "gid");
  assertEquals(p.get("limit"), "10");
  assertEquals(p.get("offset"), "cur");
});

Deno.test("list-tasks: omits filters that are undefined", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({}, ctx);
  const p = new URL(calls[0].url).searchParams;
  assert(!p.has("assignee"));
  assert(!p.has("project"));
  assert(!p.has("offset"));
});
