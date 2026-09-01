import { assertEquals } from "@std/assert";
import guestAdd from "../../actions/guest-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("guest-add: posts the guest list and an optional single ticket type", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await guestAdd.execute(
    {
      eventId: "evt-1",
      guests: [{ email: "a@b.com", name: "Ada" }, { email: "c@d.com" }],
      eventTicketTypeId: "ttype-1",
      approvalStatus: "approved",
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/events/guests/add");
  assertEquals(JSON.parse(calls[0].body!), {
    event_id: "evt-1",
    guests: [{ email: "a@b.com", name: "Ada" }, { email: "c@d.com" }],
    ticket: { event_ticket_type_id: "ttype-1" },
    approval_status: "approved",
  });
});

Deno.test("guest-add: no ticket type set means no `ticket` key is sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await guestAdd.execute({ eventId: "evt-1", guests: [{ email: "a@b.com" }] }, ctx);
  assertEquals("ticket" in JSON.parse(calls[0].body!), false);
});
