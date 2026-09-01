import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-booking.ts";

Deno.test("get-booking: GETs /{accountId}/profiles/{profileId}/bookings/{bookingId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "book-1" } }]);
  const result = await action.execute(
    { accountId: "acc-1", profileId: "prof-1", bookingId: "book-1", displayTimeZone: "UTC" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/acc-1/profiles/prof-1/bookings/book-1");
  assertEquals(url.searchParams.get("displayTimeZone"), "UTC");
  assertEquals(result, { id: "book-1" });
});

Deno.test("get-booking: defaults response fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ accountId: "acc-1", profileId: "prof-1", bookingId: "book-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.searchParams.get("fields"),
    "id,title,accountId,profileId,createdAt,startsAt,endsAt,location,tentative,timeZone,cancelled,numberOfSlots",
  );
});
