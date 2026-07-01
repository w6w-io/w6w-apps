import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-meeting.ts";

Deno.test("create-meeting: POSTs /crm/v3/objects/meetings with title + start/end", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1" } }]);
  await action.execute!(
    {
      hs_meeting_title: "Standup",
      hs_meeting_start_time: "2026-01-05T10:00:00Z",
      hs_meeting_end_time: "2026-01-05T10:30:00Z",
    },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/meetings");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.properties.hs_meeting_title, "Standup");
  assertEquals(body.properties.hs_meeting_start_time, "2026-01-05T10:00:00Z");
});
