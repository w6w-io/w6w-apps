import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/campaign-schedule.ts";

Deno.test("campaign-schedule: POSTs sendcampaign?isschedule=true with the schedule fields", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    { body: { message: "Success", campaign_status: "ScheduledAfterReviewed", code: "200" } },
  ]);
  const out = await action.execute(
    {
      campaignKey: "abc",
      scheduleDate: "01/19/2027",
      scheduleHour: 12,
      scheduleMinute: 15,
      amPm: "PM",
      sendingTz: "Asia/Kolkata",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/sendcampaign");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.searchParams.get("isschedule"), "true");
  assertEquals(url.searchParams.get("campaignkey"), "abc");
  assertEquals(url.searchParams.get("scheduleDate"), "01/19/2027");
  assertEquals(url.searchParams.get("scheduleHour"), "12");
  assertEquals(url.searchParams.get("scheduleMinute"), "15");
  assertEquals(url.searchParams.get("am_pm"), "PM");
  assertEquals(url.searchParams.get("sendingTZ"), "Asia/Kolkata");
  assertEquals(out, { message: "Success", campaignStatus: "ScheduledAfterReviewed" });
});
