import { assertEquals } from "@std/assert";
import { mockFreshBooksCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-update.ts";

Deno.test("time-entry-update: PUTs /time_entries/{timeEntryId} with the fields envelope", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { time_entry: {} } }]);
  await action.execute({ timeEntryId: "5095", fields: { duration: 600 } }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.freshbooks.com/timetracking/business/biz1/time_entries/5095",
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { time_entry: { duration: 600 } });
});
