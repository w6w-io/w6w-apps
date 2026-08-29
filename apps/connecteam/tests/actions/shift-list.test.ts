import { assertEquals } from "@std/assert";
import shiftList from "../../actions/shift-list.ts";
import { mockCtx, pagedEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("shift-list: uses the v2 shifts path with the required time window", async () => {
  const { ctx, calls } = mockCtx([
    { body: pagedEnvelope({ shifts: [{ id: "sh_1" }] }, { offset: 0 }) },
  ]);
  const out = await shiftList.execute(
    { schedulerId: 10, startTime: 1700000000, endTime: 1700086400 },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/scheduler/v2/schedulers/10/shifts");
  assertEquals(
    queryOf(calls[0].url),
    { startTime: "1700000000", endTime: "1700086400" },
  );
  assertEquals(out, { shifts: [{ id: "sh_1" }], offset: 0 });
});

Deno.test("shift-list: assignedUserIds and jobId are repeated-key array filters", async () => {
  const { ctx, calls } = mockCtx([{ body: pagedEnvelope({ shifts: [] }) }]);
  await shiftList.execute(
    {
      schedulerId: 10,
      startTime: 1,
      endTime: 2,
      assignedUserIds: "1,2",
      jobId: "job_a,job_b",
    },
    ctx,
  );
  assertEquals(queryOf(calls[0].url).assignedUserIds, ["1", "2"]);
  assertEquals(queryOf(calls[0].url).jobId, ["job_a", "job_b"]);
});
