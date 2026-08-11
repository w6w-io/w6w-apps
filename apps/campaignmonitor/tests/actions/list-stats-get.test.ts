import { assertEquals } from "@std/assert";
import listStatsGet from "../../actions/list-stats-get.ts";
import { API_PATH, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-stats-get: GETs /lists/{listid}/stats.json", async () => {
  const stats = {
    TotalActiveSubscribers: 6,
    NewActiveSubscribersToday: 0,
    NewActiveSubscribersThisWeek: 8,
    TotalUnsubscribes: 2,
    TotalDeleted: 0,
    TotalBounces: 0,
  };
  const { ctx, calls } = mockCtx([{ body: stats }]);
  const out = await listStatsGet.execute({ listId: "lid" }, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/lists/lid/stats.json`);
  assertEquals(out, stats);
});
