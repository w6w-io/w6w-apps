import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/move-task.ts";

Deno.test("move-task: POSTs /sections/{section}/addTask with { data: { task: id } }", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ id: "t-1", section: "s-2" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/sections/s-2/addTask");
  assertEquals(JSON.parse(calls[0].body!), { data: { task: "t-1" } });
});
