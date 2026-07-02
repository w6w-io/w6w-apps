import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-subtasks.ts";

Deno.test("list-subtasks: GETs /tasks/{taskId}/subtasks with default limit=100", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({ taskId: "t-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/tasks/t-1/subtasks");
  assertEquals(url.searchParams.get("limit"), "100");
  assertEquals(calls[0].method, "GET");
});

Deno.test("list-subtasks: forwards optional pagination + opt_fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({
    taskId: "t-1",
    limit: 25,
    offset: "cur-abc",
    opt_fields: "gid,name",
    opt_pretty: true,
  }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("limit"), "25");
  assertEquals(params.get("offset"), "cur-abc");
  assertEquals(params.get("opt_fields"), "gid,name");
  assertEquals(params.get("opt_pretty"), "true");
});

Deno.test("list-subtasks: omits undefined offset", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({ taskId: "t-1" }, ctx);
  assert(!new URL(calls[0].url).searchParams.has("offset"));
});
