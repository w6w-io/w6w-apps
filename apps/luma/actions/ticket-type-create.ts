import type { ActionDefinition } from "@w6w/types";
import { compact, LumaClient } from "../lib/client.ts";
import { eventIdParam } from "../lib/params.ts";

interface Input {
  eventId: string;
  name: string;
  type: "free" | "paid";
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

/**
 * `POST /v1/events/ticket-types/create`. Paid ticket types require the
 * calendar to have a connected Stripe account (this app cannot verify that in
 * advance — Luma's own 4xx on a missing Stripe connection applies).
 */
const ticketTypeCreate: ActionDefinition<Input> = {
  key: "ticket-type-create",
  type: "perform",
  resource: "ticket-type",
  title: "Create Ticket Type",
  description: "Create a new ticket type for an event.",
  idempotent: false,
  params: [
    eventIdParam,
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 30 } },
    {
      key: "type",
      label: "Free or paid",
      type: "select",
      required: true,
      options: [
        { value: "free", label: "Free" },
        { value: "paid", label: "Paid" },
      ],
    },
    {
      key: "cents",
      label: "Price (cents)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Paid tickets only.",
    },
    { key: "currency", label: "Currency", type: "string", placeholder: "usd" },
    { key: "requireApproval", label: "Require approval", type: "boolean" },
    { key: "isHidden", label: "Hidden", type: "boolean" },
    { key: "description", label: "Description", type: "text", validation: { maxLength: 1000 } },
    {
      key: "maxCapacity",
      label: "Max capacity",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    {
      key: "validStartAt",
      label: "Sales start",
      type: "date",
      hint: "ISO 8601 date, e.g. 2025-09-01.",
    },
    { key: "validEndAt", label: "Sales end", type: "date", hint: "ISO 8601 date." },
    {
      key: "isFlexible",
      label: "Pay-what-you-want",
      type: "boolean",
      advanced: true,
      hint: "Paid tickets only — lets the buyer choose an amount at or above the price.",
    },
    {
      key: "minCents",
      label: "Minimum price (cents)",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0 },
      hint: "Pay-what-you-want tickets only.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Ticket type ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new LumaClient(ctx).json("/v1/events/ticket-types/create", {
      method: "POST",
      body: compact({
        event_id: input.eventId,
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

export default ticketTypeCreate;
