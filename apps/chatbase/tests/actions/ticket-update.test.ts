import { assertEquals } from "@std/assert";
import ticketUpdate from "../../actions/ticket-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ticket-update: PATCH with only provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { ticketNumber: 1, statusCategory: "closed" } }]);
  await ticketUpdate.execute({ agentId: "a1", ticketNumber: 1, statusCategory: "closed" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/helpdesk/tickets/1");
  assertEquals(JSON.parse(calls[0].body!), { statusCategory: "closed" });
});

Deno.test("ticket-update: unassign sends an explicit assigneeId: null, ignoring assigneeEmail", async () => {
  const { ctx, calls } = mockCtx([{ body: { ticketNumber: 1, assigneeId: null } }]);
  await ticketUpdate.execute(
    { agentId: "a1", ticketNumber: 1, unassign: true, assigneeEmail: "ignored@example.com" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { assigneeId: null });
});

Deno.test("ticket-update: clearTeam sends an explicit teamId: null, ignoring teamId", async () => {
  const { ctx, calls } = mockCtx([{ body: { ticketNumber: 1, teamId: null } }]);
  await ticketUpdate.execute(
    { agentId: "a1", ticketNumber: 1, clearTeam: true, teamId: "ignored-uuid" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { teamId: null });
});
