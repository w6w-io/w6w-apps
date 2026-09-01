import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-booking.ts";

Deno.test("create-booking: POSTs /{accountId}/profiles/{profileId}/bookings with the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "book-1" } }]);
  await action.execute(
    {
      accountId: "acc-1",
      profileId: "prof-1",
      startsAt: "2026-08-15T14:00:00",
      endsAt: "2026-08-15T14:30:00",
      timeZone: "Europe/London",
      title: "Consult",
      teamMemberId: "tm-1",
      appointmentTypeIds: ["at-1"],
      answers: [{ code: "EMAIL", string: "a@b.com" }],
      numberOfSlots: 1,
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v1/acc-1/profiles/prof-1/bookings");
  assertEquals(
    JSON.parse(calls[0].body!),
    {
      startsAt: "2026-08-15T14:00:00",
      endsAt: "2026-08-15T14:30:00",
      timeZone: "Europe/London",
      title: "Consult",
      teamMemberId: "tm-1",
      appointmentTypeIds: ["at-1"],
      answers: [{ code: "EMAIL", string: "a@b.com" }],
      numberOfSlots: 1,
    },
  );
});

Deno.test("create-booking: defaults response fields to id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "book-1" } }]);
  await action.execute(
    {
      accountId: "acc-1",
      profileId: "prof-1",
      startsAt: "2026-08-15T14:00:00",
      endsAt: "2026-08-15T14:30:00",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("fields"), "id");
});
