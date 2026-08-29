import { assertEquals } from "@std/assert";
import timelogDelete from "../../actions/timelog-delete.ts";
import { mockWrikeCtx, pathOf } from "../_helpers.ts";

Deno.test("timelog-delete: DELETEs /timelogs/{timelogId}", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: {} }]);
  const out = await timelogDelete.execute({ timelogId: "TL1" }, ctx) as { status: number };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v4/timelogs/TL1");
  assertEquals(out.status, 200);
});
