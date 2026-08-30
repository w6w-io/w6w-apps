import { assertEquals } from "@std/assert";
import shiftUpdate from "../../actions/shift-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("shift-update: PUTs a one-element array carrying its own shiftId", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ shifts: [{ id: "sh_1" }], createdShifts: [], deletedShiftIds: [] }) },
  ]);
  const out = await shiftUpdate.execute(
    { schedulerId: 10, shiftId: "sh_1", title: "Renamed" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/scheduler/v2/schedulers/10/shifts");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), [{ shiftId: "sh_1", title: "Renamed" }]);
  assertEquals(out, { shifts: [{ id: "sh_1" }], createdShifts: [], deletedShiftIds: [] });
});

Deno.test("shift-update: idempotent", () => {
  assertEquals(shiftUpdate.idempotent, true);
});
