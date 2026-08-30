import { assertEquals } from "@std/assert";
import timeActivityDelete from "../../actions/time-activity-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("time-activity-delete: DELETEs the specific time activity and returns the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await timeActivityDelete.execute({ timeClockId: 5, timeActivityId: "ta_1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/time-clock/v1/time-clocks/5/time-activities/ta_1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});

Deno.test("time-activity-delete: idempotent", () => {
  assertEquals(timeActivityDelete.idempotent, true);
});
