import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-task.ts";

Deno.test("update-task: PUTs /tasks/{id} with provided fields only", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ id: "t-1", name: "n2", completed: true }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/tasks/t-1");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent, { data: { name: "n2", completed: true } });
});

Deno.test("update-task: omits id from the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ id: "t-1", notes: "hi" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert(!("id" in sent.data));
});
