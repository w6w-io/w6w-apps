import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/ticket-add-note.ts";

Deno.test("ticket-add-note: POSTs an internal-note message, always private", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { id: 1 } }]);
  await action.execute({ ticketId: 12, bodyText: "Escalating to billing." }, ctx);
  assertEquals(calls[0].url, "https://acme.gorgias.com/api/tickets/12/messages");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.channel, "internal-note");
  assertEquals(body.from_agent, true);
  assertEquals(body.public, false);
  assertEquals(body.body_text, "Escalating to billing.");
});

Deno.test("ticket-add-note: parses comma-separated mention IDs into numbers", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: {} }]);
  await action.execute({ ticketId: 12, bodyText: "note", mentionUserIds: "4, 7" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).mention_ids, [4, 7]);
});

Deno.test("ticket-add-note: omits mention_ids entirely when unset", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: {} }]);
  await action.execute({ ticketId: 12, bodyText: "note" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).mention_ids, undefined);
});
