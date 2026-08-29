import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/ticket-get.ts";

Deno.test("ticket-get: GETs /tickets/{id}", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { id: 123, subject: "Refund" } }]);
  const out = await action.execute({ ticketId: 123 }, ctx);
  assertEquals(calls[0].url, "https://acme.gorgias.com/api/tickets/123");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: 123, subject: "Refund" });
});
