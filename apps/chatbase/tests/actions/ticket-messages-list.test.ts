import { assertEquals } from "@std/assert";
import ticketMessagesList from "../../actions/ticket-messages-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("ticket-messages-list: GET .../tickets/{n}/messages, joins types", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "msg1", type: "reply" }]) }]);
  const out = await ticketMessagesList.execute(
    { agentId: "a1", ticketNumber: 1, types: ["reply", "event"], order: "desc" },
    ctx,
  ) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/helpdesk/tickets/1/messages");
  assertEquals(queryOf(calls[0].url), { types: "reply,event", order: "desc" });
  assertEquals(out.data.length, 1);
});
