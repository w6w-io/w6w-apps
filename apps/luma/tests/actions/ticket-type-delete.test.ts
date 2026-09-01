import { assertEquals } from "@std/assert";
import ticketTypeDelete from "../../actions/ticket-type-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ticket-type-delete: posts event_ticket_type_id and returns ok", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await ticketTypeDelete.execute({ eventTicketTypeId: "ttype-1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/events/ticket-types/delete");
  assertEquals(JSON.parse(calls[0].body!), { event_ticket_type_id: "ttype-1" });
  assertEquals(out, { ok: true });
});
