import type { Param } from "@w6w/types";

/**
 * Gorgias's cursor-based pagination, the form every list endpoint takes.
 * Verified against developers.gorgias.com/reference/pagination — replaced
 * offset-based pagination, so there is no `page`/`offset` param to expose.
 */
export const pagination: Param[] = [
  {
    key: "cursor",
    label: "Cursor",
    type: "string",
    advanced: true,
    hint: "Opaque value from a previous response's `meta.next_cursor`. Omit for the first page.",
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 30,
    row: "page",
    validation: { min: 1, max: 100, integer: true },
    hint: "Gorgias caps this at 100.",
  },
];

/**
 * `channel` (`LegacyChannelSlug`) is the smaller, curated set Gorgias's own
 * ticket/message schemas reference for this field — verified against the
 * `CreateTicket`/`CreateMessage` OpenAPI schemas at
 * developers.gorgias.com/reference/create-ticket.
 */
export const channelOptions = [
  { value: "email", label: "Email" },
  { value: "chat", label: "Chat" },
  { value: "phone", label: "Phone" },
  { value: "sms", label: "SMS" },
  { value: "contact_form", label: "Contact form" },
  { value: "help-center", label: "Help center" },
  { value: "facebook", label: "Facebook" },
  { value: "facebook-mention", label: "Facebook mention" },
  { value: "facebook-messenger", label: "Facebook Messenger" },
  { value: "facebook-recommendations", label: "Facebook recommendations" },
  { value: "instagram-comment", label: "Instagram comment" },
  { value: "instagram-ad-comment", label: "Instagram ad comment" },
  { value: "instagram-direct-message", label: "Instagram direct message" },
  { value: "instagram-mention", label: "Instagram mention" },
  { value: "twitter", label: "Twitter" },
  { value: "twitter-direct-message", label: "Twitter direct message" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "yotpo-review", label: "Yotpo review" },
  { value: "aircall", label: "Aircall" },
  { value: "internal-note", label: "Internal note" },
  { value: "api", label: "API" },
];

export const priorityOptions = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];

export const ticketStatusOptions = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

export const ticketOutput = [
  { key: "id", type: "number" as const, label: "Ticket ID" },
  { key: "subject", type: "string" as const, label: "Subject" },
  { key: "status", type: "string" as const, label: "Status" },
  { key: "priority", type: "string" as const, label: "Priority" },
];

export const customerOutput = [
  { key: "id", type: "number" as const, label: "Customer ID" },
  { key: "email", type: "string" as const, label: "Email" },
  { key: "name", type: "string" as const, label: "Name" },
];

export const viewOutput = [
  { key: "id", type: "number" as const, label: "View ID" },
  { key: "name", type: "string" as const, label: "Name" },
  { key: "category", type: "string" as const, label: "Category" },
];

export const surveyOutput = [
  { key: "id", type: "number" as const, label: "Survey ID" },
  { key: "ticket_id", type: "number" as const, label: "Ticket ID" },
  { key: "score", type: "number" as const, label: "Score" },
];
