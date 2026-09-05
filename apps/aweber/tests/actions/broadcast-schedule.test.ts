import { assertEquals } from "@std/assert";
import broadcastSchedule from "../../actions/broadcast-schedule.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("broadcast-schedule: posts scheduled_for to /schedule", async () => {
  const { ctx, calls } = mockCtx([
    { body: { self_link: "https://api.aweber.com/1.0/accounts/1/lists/2/broadcasts/1" } },
  ]);
  await broadcastSchedule.execute(
    {
      accountId: "1",
      listId: "2",
      broadcastId: "1",
      scheduledFor: "2027-01-01T09:00:00-05:00",
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists/2/broadcasts/1/schedule");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { scheduled_for: "2027-01-01T09:00:00-05:00" });
});
