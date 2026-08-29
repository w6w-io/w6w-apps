import { assertEquals } from "@std/assert";
import queueGet from "../../actions/queue-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("queue-get: fetches the queue over the given date range", async () => {
  const { ctx, calls } = mockCtx([{
    body: { social_set_id: 4, start_date: "2026-02-01", end_date: "2026-02-29", days: [] },
  }]);
  await queueGet.execute({ socialSetId: 4, startDate: "2026-02-01", endDate: "2026-02-29" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/social-sets/4/queue");
  assertEquals(queryOf(calls[0].url), { start_date: "2026-02-01", end_date: "2026-02-29" });
});
