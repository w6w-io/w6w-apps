import { assertEquals } from "@std/assert";
import guestList from "../../actions/guest-list.ts";
import { listBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("guest-list: filters and pages by cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody([{ id: "gst-1" }], { next_cursor: "c2" }) }]);
  const out = await guestList.execute(
    { eventId: "evt-1", approvalStatus: "approved", paginationLimit: 50 },
    ctx,
  ) as { entries: unknown[]; next_cursor?: string };

  assertEquals(pathOf(calls[0].url), "/v1/events/guests/list");
  assertEquals(queryOf(calls[0].url), {
    event_id: "evt-1",
    approval_status: "approved",
    pagination_limit: "50",
  });
  assertEquals(out.entries.length, 1);
  assertEquals(out.next_cursor, "c2");
});
