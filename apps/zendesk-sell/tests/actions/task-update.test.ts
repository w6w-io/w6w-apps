import { assertEquals } from "@std/assert";
import taskUpdate from "../../actions/task-update.ts";
import { dataEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-update: PUTs the completion state and content", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 1 }) }]);
  await taskUpdate.execute({ id: 1, completed: false, content: "Contact Tom and Rachel" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/tasks/1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data, { completed: false, content: "Contact Tom and Rachel" });
});
