import { assertEquals } from "@std/assert";
import queueScheduleGet from "../../actions/queue-schedule-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("queue-schedule-get: fetches the social set's queue schedule", async () => {
  const { ctx, calls } = mockCtx([{
    body: { social_set_id: 4, timezone: "America/New_York", rules: [] },
  }]);
  const out = await queueScheduleGet.execute({ socialSetId: 4 }, ctx) as { timezone: string };
  assertEquals(pathOf(calls[0].url), "/v2/social-sets/4/queue/schedule");
  assertEquals(out.timezone, "America/New_York");
});
