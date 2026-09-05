import { assertEquals } from "@std/assert";
import taskUpdate from "../../actions/task-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-update: calls PUT /1/Tasks, form-urlencoded", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ attrs: { id: "1" } }) }]);
  await taskUpdate.execute({ id: "1", owner: "3", status: "1" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/1/Tasks");
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("id"), "1");
  assertEquals(form.get("owner"), "3");
  assertEquals(form.get("status"), "1");
});
