import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/ticket-delete.ts";

Deno.test("ticket-delete: DELETEs /tickets/{id}", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ status: 204 }]);
  const out = await action.execute({ ticketId: 1 }, ctx);
  assertEquals(calls[0].url, "https://acme.gorgias.com/api/tickets/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, {});
});
