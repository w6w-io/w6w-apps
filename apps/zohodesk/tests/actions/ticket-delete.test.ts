import { assertEquals } from "@std/assert";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-delete.ts";

Deno.test("ticket-delete: POSTs /tickets/moveToTrash with a single-element ticketIds array", async () => {
  const { ctx, calls } = mockDeskCtx([{ status: 204 }]);
  const out = await action.execute({ recordId: "42" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/tickets/moveToTrash");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { ticketIds: ["42"] });
  assertEquals(out, { deleted: true });
});

Deno.test("ticket-delete: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
