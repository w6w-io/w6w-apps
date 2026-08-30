import { assertEquals } from "@std/assert";
import clockIn from "../../actions/clock-in.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("clock-in: POSTs to the time clock's clock-in path with a compacted body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ shift: { id: "sh_1", userId: 7 } }) }]);
  const out = await clockIn.execute({ timeClockId: 99, userId: 7 }, ctx);
  assertEquals(pathOf(calls[0].url), "/time-clock/v1/time-clocks/99/clock-in");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { userId: 7 });
  assertEquals(out, { shift: { id: "sh_1", userId: 7 } });
});

Deno.test("clock-in: passes through jobId, timezone, schedulerShiftId and timestamp when set", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ shift: {} }) }]);
  await clockIn.execute(
    {
      timeClockId: 1,
      userId: 2,
      jobId: "job_1",
      timezone: "America/New_York",
      schedulerShiftId: "sh_sched_1",
      timestamp: 1700000000,
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    userId: 2,
    jobId: "job_1",
    timezone: "America/New_York",
    schedulerShiftId: "sh_sched_1",
    timestamp: 1700000000,
  });
});

Deno.test("clock-in: not idempotent — a retry opens a second shift", () => {
  assertEquals(clockIn.idempotent, false);
});
