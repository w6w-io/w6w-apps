import { assertEquals } from "@std/assert";
import getChannelStreamSchedule from "../../actions/get-channel-stream-schedule.ts";
import { mockCtx, pathOf, queryAll, queryOf } from "../_helpers.ts";

/**
 * `data` here is an OBJECT, not the array every sibling endpoint returns. A
 * caller that treats it as a list gets nothing, silently.
 */
Deno.test("get-channel-stream-schedule: data is an object whose segments are the list", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        broadcaster_id: "141981764",
        segments: [{ id: "seg1", title: "TwitchDev Monthly" }],
        vacation: null,
      },
      pagination: {},
    },
  }]);
  const out = await getChannelStreamSchedule.execute({ broadcasterId: "141981764" }, ctx) as {
    data: { segments: unknown[]; vacation: unknown };
  };

  assertEquals(pathOf(calls[0].url), "/helix/schedule");
  assertEquals(queryOf(calls[0].url), { broadcaster_id: "141981764" });
  assertEquals(Array.isArray(out.data), false);
  assertEquals(out.data.segments.length, 1);
  assertEquals(out.data.vacation, null);
});

Deno.test("get-channel-stream-schedule: segment IDs repeat their key, and start_time is forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { segments: [] }, pagination: {} } }]);
  await getChannelStreamSchedule.execute({
    broadcasterId: "1",
    id: "seg1,seg2",
    startTime: "2026-09-01T00:00:00Z",
    first: 25,
  }, ctx);

  assertEquals(queryAll(calls[0].url, "id"), ["seg1", "seg2"]);
  assertEquals(queryOf(calls[0].url).start_time, "2026-09-01T00:00:00Z");
  assertEquals(queryOf(calls[0].url).first, "25");
});

/** Twitch caps this endpoint's page size at 25, not the usual 100. */
Deno.test("get-channel-stream-schedule: the page-size param declares Twitch's 25 ceiling", () => {
  const first = getChannelStreamSchedule.params?.find((p) => p.key === "first");
  assertEquals(first?.validation?.max, 25);
});
