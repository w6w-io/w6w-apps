import { assertEquals } from "@std/assert";
import { mockFreshBooksCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-get.ts";

Deno.test("time-entry-get: GETs /time_entries/{timeEntryId}", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { time_entry: {} } }]);
  await action.execute({ timeEntryId: "5095" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.freshbooks.com/timetracking/business/biz1/time_entries/5095",
  );
});
