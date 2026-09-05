import { assertEquals } from "@std/assert";
import publishScheduleCancel from "../../actions/publish-schedule-cancel.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("publish-schedule-cancel: DELETEs the schedule", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({}) }]);
  const out = await publishScheduleCancel.execute({ scheduleId: "sch1" }, ctx) as {
    canceled: boolean;
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/publish-schedules/sch1");
  assertEquals(out.canceled, true);
});

Deno.test("publish-schedule-cancel: is declared idempotent", () => {
  assertEquals(publishScheduleCancel.idempotent, true);
});
