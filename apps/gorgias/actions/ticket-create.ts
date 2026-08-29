import type { ActionDefinition } from "@w6w/types";
import { csv, GorgiasClient, unset } from "../lib/client.ts";
import {
  channelOptions,
  priorityOptions,
  ticketOutput,
  ticketStatusOptions,
} from "../lib/params.ts";

interface Input {
  subject?: string;
  channel: string;
  status?: string;
  priority?: string;
  externalId?: string;
  customerId?: number;
  customerEmail?: string;
  customerName?: string;
  fromAgent: boolean;
  bodyText: string;
  bodyHtml?: string;
  tags?: string;
}

/**
 * `POST /tickets` — verified against `CreateTicket`'s OpenAPI schema
 * (developers.gorgias.com/reference/create-ticket). A ticket is created from
 * at least one message, so `messages` (with `channel` + `from_agent`) is
 * required by the vendor's own schema; this action collects the fields for a
 * single opening message rather than the full 500-item array the API allows.
 */
const ticketCreate: ActionDefinition<Input> = {
  key: "ticket-create",
  type: "perform",
  resource: "ticket",
  title: "Create Ticket",
  description: "Open a support ticket with its first message.",
  // Gorgias mints a new ticket id per call and has no create-or-update
  // endpoint to converge a retry on.
  idempotent: false,
  params: [
    { key: "subject", label: "Subject", type: "string" },
    {
      key: "channel",
      label: "Channel",
      type: "select",
      required: true,
      default: "email",
      options: channelOptions,
      hint: "Channel used to initiate the conversation, and to send the opening message.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "open",
      options: ticketStatusOptions,
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      default: "normal",
      options: priorityOptions,
    },
    {
      key: "fromAgent",
      label: "From agent",
      type: "boolean",
      required: true,
      default: false,
      hint: "Whether the opening message was sent by your company rather than the customer.",
    },
    {
      key: "bodyText",
      label: "Message",
      type: "text",
      required: true,
      config: { multiline: true },
      hint: "Text version of the opening message's body.",
    },
    {
      key: "bodyHtml",
      label: "Message (HTML)",
      type: "text",
      advanced: true,
      config: { multiline: true },
      hint: "HTML version of the opening message's body, if different from the text version.",
    },
    { key: "customerId", label: "Customer ID", type: "number", row: "customer" },
    {
      key: "customerEmail",
      label: "Customer email",
      type: "string",
      row: "customer",
      hint: "Gorgias creates the customer if this address is unknown.",
    },
    { key: "customerName", label: "Customer name", type: "string", advanced: true },
    { key: "externalId", label: "External ID", type: "string", advanced: true },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated names.", advanced: true },
  ],
  output: ticketOutput,

  execute(input, ctx) {
    const customer = input.customerId
      ? { id: input.customerId }
      : (input.customerEmail || input.customerName)
      ? { email: unset(input.customerEmail), name: unset(input.customerName) }
      : undefined;

    return new GorgiasClient(ctx).request("/tickets", {
      method: "POST",
      body: {
        subject: unset(input.subject),
        channel: input.channel,
        status: input.status,
        priority: input.priority,
        external_id: unset(input.externalId),
        customer,
        tags: csv(input.tags)?.map((name) => ({ name })),
        messages: [{
          channel: input.channel,
          from_agent: input.fromAgent,
          body_text: input.bodyText,
          body_html: unset(input.bodyHtml),
        }],
      },
    });
  },
};

export default ticketCreate;
