import type { ActionDefinition } from "@w6w/types";
import { compact, LumaClient } from "../lib/client.ts";
import { eventTicketTypeIdParam } from "../lib/params.ts";

interface Input {
  eventTicketTypeId: string;
  name?: string;
  type?: "free" | "paid";
  cents?: number;
  currency?: string;
  requireApproval?: boolean;
  isHidden?: boolean;
  description?: string;
  maxCapacity?: number;
  validStartAt?: string;
  validEndAt?: string;
  isFlexible?: boolean;
  minCents?: number;
}

/** `POST /v1/events/ticket-types/update`. Every field but the id is optional. */
const ticketTypeUpdate: ActionDefinition<Input> = {
  key: "ticket-type-update",
  type: "perform",
  resource: "ticket-type",
  title: "Update Ticket Type",
  description: "Update one or more fields of an existing ticket type.",
  idempotent: true,
  params: [
    eventTicketTypeIdParam,
    { key: "name", label: "Name", type: "string", validation: { maxLength: 30 } },
    {
      key: "type",
      label: "Free or paid",
      type: "select",
      options: [
        { value: "free", label: "Free" },
        { value: "paid", label: "Paid" },
      ],
    },
    { key: "cents", label: "Price (cents)", type: "number", validation: { integer: true, min: 0 } },
    { key: "currency", label: "Currency", type: "string" },
    { key: "requireApproval", label: "Require approval", type: "boolean" },
    { key: "isHidden", label: "Hidden", type: "boolean" },
    { key: "description", label: "Description", type: "text", validation: { maxLength: 1000 } },
    {
      key: "maxCapacity",
      label: "Max capacity",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    { key: "validStartAt", label: "Sales start", type: "date" },
    { key: "validEndAt", label: "Sales end", type: "date" },
    { key: "isFlexible", label: "Pay-what-you-want", type: "boolean", advanced: true },
    {
      key: "minCents",
      label: "Minimum price (cents)",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0 },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Ticket type ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new LumaClient(ctx).json("/v1/events/ticket-types/update", {
      method: "POST",
      body: compact({
        event_ticket_type_id: input.eventTicketTypeId,
        name: input.name,
        type: input.type,
        cents: input.cents,
        currency: input.currency,
        require_approval: input.requireApproval,
        is_hidden: input.isHidden,
        description: input.description,
        max_capacity: input.maxCapacity,
        valid_start_at: input.validStartAt,
        valid_end_at: input.validEndAt,
        is_flexible: input.isFlexible,
        min_cents: input.minCents,
      }),
    });
  },
};

export default ticketTypeUpdate;
