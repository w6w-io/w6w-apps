import { assertEquals } from "@std/assert";
import guestUpdateTickets from "../../actions/guest-update-tickets.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("guest-update-tickets: maps ticketTypeIdsToAdd to tickets_to_add objects", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await guestUpdateTickets.execute(
    {
      eventId: "evt-1",
      guestId: "gst-1",
      ticketIdsToRemove: ["tkt-1"],
      ticketTypeIdsToAdd: ["ttype-1", "ttype-2"],
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/events/guests/update-tickets");
  assertEquals(JSON.parse(calls[0].body!), {
    event_id: "evt-1",
    guest_id: "gst-1",
    ticket_ids_to_remove: ["tkt-1"],
    tickets_to_add: [
      { event_ticket_type_id: "ttype-1" },
      { event_ticket_type_id: "ttype-2" },
    ],
  });
});
