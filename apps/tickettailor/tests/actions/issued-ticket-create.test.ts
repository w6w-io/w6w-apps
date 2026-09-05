import { assertEquals } from "@std/assert";
import issuedTicketCreate from "../../actions/issued-ticket-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("issued-ticket-create: issues from event + ticket type inventory", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: [{ id: "it_1" }] } }]);
  await issuedTicketCreate.execute(
    { fullName: "John Doe", eventId: "ev_1", ticketTypeId: "tt_1", email: "john@example.com" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/issued_tickets");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("full_name"), "John Doe");
  assertEquals(body.get("event_id"), "ev_1");
  assertEquals(body.get("ticket_type_id"), "tt_1");
  assertEquals(body.has("hold_id"), false);
});

Deno.test("issued-ticket-create: issues from a hold instead", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: [{ id: "it_2" }] } }]);
  await issuedTicketCreate.execute({ fullName: "Jane Doe", holdId: "ho_1" }, ctx);
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("hold_id"), "ho_1");
  assertEquals(body.has("event_id"), false);
});
