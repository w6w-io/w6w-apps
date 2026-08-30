import { assertEquals } from "@std/assert";
import ticketSearch from "../../actions/ticket-search.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ticket-search: POST .../tickets/search with query and limit", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: [{ ticketNumber: 1 }], pagination: { cursor: null, hasMore: false } } },
  ]);
  const out = await ticketSearch.execute(
    { agentId: "a1", query: "refund not received", limit: 10 },
    ctx,
  ) as { data: unknown[] };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/helpdesk/tickets/search");
  assertEquals(JSON.parse(calls[0].body!), { query: "refund not received", limit: 10 });
  assertEquals(out.data.length, 1);
});
