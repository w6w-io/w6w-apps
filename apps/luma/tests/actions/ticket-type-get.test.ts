import { assertEquals } from "@std/assert";
import ticketTypeGet from "../../actions/ticket-type-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("ticket-type-get: looks up by event_ticket_type_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ttype-1", name: "General" } }]);
  const out = await ticketTypeGet.execute({ eventTicketTypeId: "ttype-1" }, ctx) as {
    name: string;
  };

  assertEquals(pathOf(calls[0].url), "/v1/events/ticket-types/get");
  assertEquals(queryOf(calls[0].url), { event_ticket_type_id: "ttype-1" });
  assertEquals(out.name, "General");
});
