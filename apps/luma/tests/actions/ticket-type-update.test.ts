import { assertEquals } from "@std/assert";
import ticketTypeUpdate from "../../actions/ticket-type-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ticket-type-update: posts only event_ticket_type_id when nothing else is set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ttype-1" } }]);
  await ticketTypeUpdate.execute({ eventTicketTypeId: "ttype-1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/events/ticket-types/update");
  assertEquals(JSON.parse(calls[0].body!), { event_ticket_type_id: "ttype-1" });
});

Deno.test("ticket-type-update: only the named field changes", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ttype-1" } }]);
  await ticketTypeUpdate.execute({ eventTicketTypeId: "ttype-1", isHidden: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { event_ticket_type_id: "ttype-1", is_hidden: true });
});
