import { assertEquals } from "@std/assert";
import taskReschedule from "../../actions/task-reschedule.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-reschedule: calls POST /1/task/reschedule with id and newtime", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 0 } }]);
  await taskReschedule.execute({ id: "2", newTime: 1713628490 }, ctx);

  assertEquals(pathOf(calls[0].url), "/1/task/reschedule");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { id: 2, newtime: 1713628490 });
});
