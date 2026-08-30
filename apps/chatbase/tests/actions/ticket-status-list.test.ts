import { assertEquals } from "@std/assert";
import ticketStatusList from "../../actions/ticket-status-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ticket-status-list: GET .../ticket-statuses, bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "st1", category: "new" }] }]);
  const out = await ticketStatusList.execute({ agentId: "a1" }, ctx) as unknown[];

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/helpdesk/ticket-statuses");
  assertEquals(out.length, 1);
  assertEquals(Array.isArray(out), true);
});
