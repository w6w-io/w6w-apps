import { assertEquals } from "@std/assert";
import holdCreate from "../../actions/hold-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("hold-create: sends the ticket_type_id association map bracket-keyed", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "ho_1" } }]);
  await holdCreate.execute(
    { eventId: "ev_1", note: "Press hold", ticketTypeId: "tt_1", quantity: 5 },
    ctx,
  );
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("event_id"), "ev_1");
  assertEquals(body.get("note"), "Press hold");
  assertEquals(body.get("ticket_type_id[tt_1]"), "5");
});
