import { assertEquals } from "@std/assert";
import timeEntryClockOut from "../../actions/time-entry-clock-out.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("time-entry-clock-out: POSTs type Out", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "t2", type: "Out" } }]);
  await timeEntryClockOut.execute({ personId: "p1", note: "done for the day" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/TimeEntries");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, "Out");
  assertEquals(body.note, "done for the day");
});
