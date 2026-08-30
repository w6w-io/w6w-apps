import { assertEquals } from "@std/assert";
import ticketMessageAdd from "../../actions/ticket-message-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ticket-message-add: POST .../messages, type is always 'reply'", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: "msg1", content: "<p>Fixed</p>", contentText: "Fixed" } },
  ]);
  const out = await ticketMessageAdd.execute(
    { agentId: "a1", ticketNumber: 1, content: "Fixed", authorEmail: "sam@example.com" },
    ctx,
  ) as { contentText: string };

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/helpdesk/tickets/1/messages");
  assertEquals(JSON.parse(calls[0].body!), {
    type: "reply",
    content: "Fixed",
    authorEmail: "sam@example.com",
  });
  assertEquals(out.contentText, "Fixed");
});
