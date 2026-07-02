import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search-tasks.ts";

Deno.test("search-tasks: GETs /workspaces/{workspace}/tasks/search with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({ workspace: "ws-1", text: "hello", completed: false }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/workspaces/ws-1/tasks/search");
  assertEquals(url.searchParams.get("text"), "hello");
  assertEquals(url.searchParams.get("completed"), "false");
});

Deno.test("search-tasks: omits text when undefined", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({ workspace: "ws-1" }, ctx);
  assert(!new URL(calls[0].url).searchParams.has("text"));
});
