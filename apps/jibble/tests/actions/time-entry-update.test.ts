import { assertEquals, assertRejects } from "@std/assert";
import timeEntryUpdate from "../../actions/time-entry-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("time-entry-update: PATCHes a plain path segment, NOT TimeEntries(id)", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await timeEntryUpdate.execute({ timeEntryId: "t1", note: "fixed" }, ctx) as {
    ok: boolean;
  };
  assertEquals(pathOf(calls[0].url), "/v1/TimeEntries/t1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(out.ok, true);
});

Deno.test("time-entry-update: refuses an empty update", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(timeEntryUpdate.execute({ timeEntryId: "t1" }, ctx)),
    Error,
    "at least one field",
  );
});
