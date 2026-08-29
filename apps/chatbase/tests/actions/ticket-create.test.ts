import { assertEquals } from "@std/assert";
import ticketCreate from "../../actions/ticket-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ticket-create: POST .../helpdesk/tickets, nests customer", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { ticketNumber: 1, statusCategory: "new", assigneeId: null } },
  ]);
  const out = await ticketCreate.execute(
    {
      agentId: "a1",
      description: "Customer cannot export orders.",
      customerEmail: "jane@example.com",
      customerName: "Jane Doe",
    },
    ctx,
  ) as { ticketNumber: number };

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/helpdesk/tickets");
  assertEquals(JSON.parse(calls[0].body!), {
    description: "Customer cannot export orders.",
    customer: { email: "jane@example.com", name: "Jane Doe" },
  });
  assertEquals(out.ticketNumber, 1);
});

Deno.test("ticket-create: forwards subject, statusCategory, and assigneeEmail", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { ticketNumber: 2, statusCategory: "on_you" } },
  ]);
  await ticketCreate.execute(
    {
      agentId: "a1",
      subject: "Export failing",
      description: "500 on export",
      customerEmail: "jane@example.com",
      statusCategory: "on_you",
      assigneeEmail: "sam@example.com",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    subject: "Export failing",
    description: "500 on export",
    customer: { email: "jane@example.com" },
    statusCategory: "on_you",
    assigneeEmail: "sam@example.com",
  });
});
