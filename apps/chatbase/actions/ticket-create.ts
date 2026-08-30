import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient, compact } from "../lib/client.ts";
import { agentIdParam, ticketStatusCategoryOptions } from "../lib/params.ts";

/**
 * `POST /agents/{agentId}/helpdesk/tickets` — `description` is written as
 * the first message, authored as a reply from the customer. Unless an
 * assignee is given, the ticket is auto-assigned via the agent's routing
 * rules. Provide at most one of `statusId`/`statusCategory` and at most one
 * of `assigneeId`/`assigneeEmail`.
 */
interface Input {
  agentId: string;
  subject?: string;
  description: string;
  customerEmail: string;
  customerName?: string;
  statusCategory?: string;
  assigneeEmail?: string;
}

const ticketCreate: ActionDefinition<Input> = {
  key: "ticket-create",
  type: "perform",
  resource: "ticket",
  title: "Create Ticket",
  description: "Create a helpdesk ticket on behalf of a customer.",
  idempotent: false,
  params: [
    agentIdParam,
    { key: "subject", label: "Subject", type: "string", validation: { maxLength: 500 } },
    {
      key: "description",
      label: "Description",
      type: "text",
      required: true,
      validation: { maxLength: 10000 },
      hint: "Written as the first message, authored as a reply from the customer.",
    },
    {
      key: "customerEmail",
      label: "Customer email",
      type: "string",
      required: true,
      hint: "Resolves to an existing customer for this agent, or creates one.",
    },
    {
      key: "customerName",
      label: "Customer name",
      type: "string",
      hint: "Used only when creating a new customer record; ignored if the email already resolves.",
    },
    {
      key: "statusCategory",
      label: "Status category",
      type: "select",
      options: ticketStatusCategoryOptions,
      hint: 'Resolves to that category\'s default status. Defaults to "new" when omitted.',
    },
    {
      key: "assigneeEmail",
      label: "Assignee email",
      type: "string",
      hint: "Email of the team member to assign. Omit to let auto-assignment apply.",
    },
  ],
  output: [
    { key: "ticketNumber", type: "number", label: "Ticket number" },
    { key: "statusCategory", type: "string", label: "Resolved status category" },
    { key: "assigneeId", type: "string", label: "Assigned agent user ID, or null" },
  ],

  execute(input, ctx) {
    const body = compact({
      subject: input.subject,
      description: input.description,
      customer: compact({ email: input.customerEmail, name: input.customerName }),
      statusCategory: input.statusCategory,
      assigneeEmail: input.assigneeEmail,
    });
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/helpdesk/tickets`,
      { method: "POST", body },
    );
  },
};

export default ticketCreate;
