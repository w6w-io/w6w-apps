import { assertEquals } from "@std/assert";
import ticketTypeUpdate from "../../actions/ticket-type-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ticket-type-update: POSTs modify_quantity as a signed delta string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "tt_1" } }]);
  await ticketTypeUpdate.execute(
    { eventSeriesId: "es_1", ticketTypeId: "tt_1", modifyQuantity: "+10" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/event_series/es_1/ticket_types/tt_1");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("modify_quantity"), "+10");
});
