import { assertEquals, assertRejects } from "@std/assert";
import timeActivityCreate from "../../actions/time-activity-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

const oneActivity = [{ userId: 1, shifts: [{ start: { timestamp: 1700000000 } }] }];

Deno.test("time-activity-create: POSTs the array body, defaulting isSplitShiftOnManualBreak to false", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ timeActivitiesByUsers: [] }) }]);
  await timeActivityCreate.execute({ timeClockId: 5, timeActivities: oneActivity }, ctx);
  assertEquals(pathOf(calls[0].url), "/time-clock/v1/time-clocks/5/time-activities");
  assertEquals(JSON.parse(calls[0].body!), {
    timeActivities: oneActivity,
    isSplitShiftOnManualBreak: false,
  });
});

Deno.test("time-activity-create: accepts the JSON param as a string too", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ timeActivitiesByUsers: [] }) }]);
  await timeActivityCreate.execute(
    { timeClockId: 5, timeActivities: JSON.stringify(oneActivity) },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).timeActivities, oneActivity);
});

Deno.test("time-activity-create: rejects an empty or non-array payload before calling the API", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => {
    await timeActivityCreate.execute({ timeClockId: 5, timeActivities: [] }, ctx);
  });
  await assertRejects(async () => {
    await timeActivityCreate.execute(
      { timeClockId: 5, timeActivities: { not: "an array" } },
      ctx,
    );
  });
  assertEquals(calls.length, 0);
});

Deno.test("time-activity-create: not idempotent", () => {
  assertEquals(timeActivityCreate.idempotent, false);
});
