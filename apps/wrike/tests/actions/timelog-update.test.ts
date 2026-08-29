import { assertEquals } from "@std/assert";
import timelogUpdate from "../../actions/timelog-update.ts";
import { envelope, mockWrikeCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("timelog-update: PUTs to /timelogs/{timelogId}, every field optional", async () => {
  const { ctx, calls } = mockWrikeCtx([
    { status: 200, body: envelope([{ id: "TL1", hours: 3 }]) },
  ]);
  await timelogUpdate.execute({ timelogId: "TL1", hours: 3 }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v4/timelogs/TL1");
  assertEquals(queryOf(calls[0].url), { hours: "3" });
});

Deno.test("timelog-update: is declared idempotent", () => {
  assertEquals(timelogUpdate.idempotent, true);
});
