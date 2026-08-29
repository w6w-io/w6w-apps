import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/ticket-update.ts";

Deno.test("ticket-update: PUTs /tickets/{id} with only the fields set", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { id: 1 } }]);
  await action.execute({ ticketId: 1, status: "closed" }, ctx);
  assertEquals(calls[0].url, "https://acme.gorgias.com/api/tickets/1");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.status, "closed");
  assertEquals(body.subject, undefined);
  assertEquals(body.priority, undefined);
});

Deno.test("ticket-update: maps isUnread to is_unread", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: {} }]);
  await action.execute({ ticketId: 1, isUnread: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).is_unread, true);
});
