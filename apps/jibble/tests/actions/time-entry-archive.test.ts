import { assertEquals } from "@std/assert";
import timeEntryArchive from "../../actions/time-entry-archive.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("time-entry-archive: soft-deletes via PATCH status Archived on the plain path", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await timeEntryArchive.execute({ timeEntryId: "t1" }, ctx) as { ok: boolean };
  assertEquals(pathOf(calls[0].url), "/v1/TimeEntries/t1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { status: "Archived" });
  assertEquals(out.ok, true);
});
