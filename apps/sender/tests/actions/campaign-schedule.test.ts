import { assertEquals } from "@std/assert";
import campaignSchedule from "../../actions/campaign-schedule.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-schedule: POSTs to /v2/campaigns/{id}/schedule", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, message: "Success scheduled" } }]);
  await campaignSchedule.execute({ id: "c1", scheduleTime: "2026-05-29 08:22:41" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/campaigns/c1/schedule");
  assertEquals(JSON.parse(calls[0].body!), { schedule_time: "2026-05-29 08:22:41" });
});
