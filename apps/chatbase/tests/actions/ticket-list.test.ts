import { assertEquals } from "@std/assert";
import ticketList from "../../actions/ticket-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("ticket-list: GET .../helpdesk/tickets", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ ticketNumber: 1 }]) }]);
  const out = await ticketList.execute({ agentId: "a1" }, ctx) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/helpdesk/tickets");
  assertEquals(out.data.length, 1);
});

Deno.test("ticket-list: joins status/channel arrays, forwards filters, maps includeTotal to a string", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await ticketList.execute(
    {
      agentId: "a1",
      status: ["new", "on_you"],
      channel: ["email", "api"],
      assigneeId: "none",
      sortBy: "updatedAt",
      order: "asc",
      includeTotal: true,
    },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    status: "new,on_you",
    channel: "email,api",
    assigneeId: "none",
    sortBy: "updatedAt",
    order: "asc",
    includeTotal: "true",
  });
});
