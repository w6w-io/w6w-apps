import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-booking.ts";

Deno.test("update-booking: PATCHes a reschedule", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "book-1" } }]);
  await action.execute(
    {
      accountId: "acc-1",
      profileId: "prof-1",
      bookingId: "book-1",
      startsAt: "2026-08-16T10:00:00",
      endsAt: "2026-08-16T10:30:00",
    },
    ctx,
  );
  assertEquals(calls[0].method, "PATCH");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/acc-1/profiles/prof-1/bookings/book-1");
  assertEquals(
    JSON.parse(calls[0].body!),
    { startsAt: "2026-08-16T10:00:00", endsAt: "2026-08-16T10:30:00" },
  );
});

Deno.test("update-booking: PATCHes a cancellation", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "book-1" } }]);
  await action.execute(
    {
      accountId: "acc-1",
      profileId: "prof-1",
      bookingId: "book-1",
      cancelled: true,
      cancellationReason: "client requested",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.cancelled, true);
  assertEquals(body.cancellationReason, "client requested");
});

Deno.test("update-booking: defaults response fields to id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "book-1" } }]);
  await action.execute({ accountId: "acc-1", profileId: "prof-1", bookingId: "book-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("fields"), "id");
});
