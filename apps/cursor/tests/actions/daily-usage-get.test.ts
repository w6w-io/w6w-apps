import { assertEquals } from "@std/assert";
import dailyUsageGet from "../../actions/daily-usage-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("daily-usage-get: omits page/pageSize from the body when neither is set", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], period: {} } }]);
  await dailyUsageGet.execute({ startDate: 1, endDate: 2 }, ctx);
  assertEquals(pathOf(calls[0].url), "/teams/daily-usage-data");
  assertEquals(JSON.parse(calls[0].body!), { startDate: 1, endDate: 2 });
});

Deno.test("daily-usage-get: sends page/pageSize only when BOTH are set", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: [], period: {}, pagination: {} } },
  ]);
  await dailyUsageGet.execute({ startDate: 1, endDate: 2, page: 1, pageSize: 1000 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { startDate: 1, endDate: 2, page: 1, pageSize: 1000 });
});
