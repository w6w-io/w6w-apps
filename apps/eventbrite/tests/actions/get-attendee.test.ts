import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-attendee.ts";

Deno.test("get-attendee: GETs /events/{eventId}/attendees/{attendeeId}/", async () => {
  const body = { id: "att-1", profile: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ eventId: "evt-1", attendeeId: "att-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/events/evt-1/attendees/att-1/");
  assertEquals(url.searchParams.toString(), "");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
