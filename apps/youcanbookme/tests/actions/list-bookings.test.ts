import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-bookings.ts";

Deno.test("list-bookings: GETs /{accountId}/bookings with mapped filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute(
    {
      accountId: "acc-1",
      profileIds: "prof-1,prof-2",
      search: "smith",
      boundaryId: "book-9",
      boundaryStartsAt: "2026-08-01T00:00:00Z",
      direction: "forwards",
      jumpToDate: "2026-08-15",
      displayTimeZone: "Europe/London",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/acc-1/bookings");
  assertEquals(url.searchParams.get("profileIds"), "prof-1,prof-2");
  assertEquals(url.searchParams.get("search"), "smith");
  assertEquals(url.searchParams.get("boundaryId"), "book-9");
  assertEquals(url.searchParams.get("boundaryStartsAt"), "2026-08-01T00:00:00Z");
  assertEquals(url.searchParams.get("direction"), "forwards");
  assertEquals(url.searchParams.get("jumpToDate"), "2026-08-15");
  assertEquals(url.searchParams.get("displayTimeZone"), "Europe/London");
});

Deno.test("list-bookings: defaults fields and omits unset filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({ accountId: "acc-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.searchParams.get("fields"),
    "id,title,accountId,profileId,createdAt,startsAt,endsAt,location,tentative,timeZone,cancelled,numberOfSlots",
  );
  assertEquals(url.searchParams.has("profileIds"), false);
  assertEquals(url.searchParams.has("search"), false);
});
