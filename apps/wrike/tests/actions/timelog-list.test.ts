import { assertEquals } from "@std/assert";
import timelogList from "../../actions/timelog-list.ts";
import { envelope, mockWrikeCtx, pathOf } from "../_helpers.ts";

Deno.test("timelog-list: GETs /tasks/{taskId}/timelogs", async () => {
  const { ctx, calls } = mockWrikeCtx([
    { status: 200, body: envelope([{ id: "TL1", hours: 2 }]) },
  ]);
  const out = await timelogList.execute({ taskId: "T1" }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v4/tasks/T1/timelogs");
  assertEquals(out.items, [{ id: "TL1", hours: 2 }]);
});
