import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/message-get-many.ts";

Deno.test("message-get-many: GETs /messages, optionally scoped to a ticket", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { data: [] } }]);
  await action.execute({ ticketId: 12, orderBy: "created_datetime:asc", limit: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/messages");
  assertEquals(url.searchParams.get("ticket_id"), "12");
  assertEquals(url.searchParams.get("order_by"), "created_datetime:asc");
  assertEquals(url.searchParams.get("limit"), "10");
});

Deno.test("message-get-many: omits ticket_id when scoping to no ticket", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { data: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("ticket_id"), false);
});
