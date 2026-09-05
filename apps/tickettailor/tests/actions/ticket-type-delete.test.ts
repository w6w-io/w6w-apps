import { assertEquals } from "@std/assert";
import ticketTypeDelete from "../../actions/ticket-type-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ticket-type-delete: DELETEs the nested ticket type path", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "tt_1", object: "ticket_type", deleted: "true" } },
  ]);
  const result = await ticketTypeDelete.execute(
    { eventSeriesId: "es_1", ticketTypeId: "tt_1" },
    ctx,
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/event_series/es_1/ticket_types/tt_1");
  assertEquals(result.deleted, "true");
});
