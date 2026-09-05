import type { OutputField, Param } from "@w6w/types";

/**
 * Shared `Param` fragments and vendor enums, copied field-for-field from the
 * per-endpoint OpenAPI fragments this app was built from
 * (`developer.justcall.io/reference/*`, fetched 2026-09-05).
 */

export const ORDER_ASC_DESC: Param = {
  key: "order",
  label: "Order",
  type: "select",
  options: [{ label: "Descending", value: "desc" }, { label: "Ascending", value: "asc" }],
  default: "desc",
  hint: "Order in which results should appear.",
};

export const PAGE: Param = {
  key: "page",
  label: "Page",
  type: "number",
  hint: "Page number to fetch.",
};

/** `per_page` defaults and hints vary by endpoint, so callers pass the vendor default and max. */
export function perPage(vendorDefault: number, max: number): Param {
  return {
    key: "per_page",
    label: "Results per page",
    type: "number",
    default: vendorDefault,
    hint: `Number of records per page. Vendor default ${vendorDefault}, maximum ${max}.`,
    validation: { max },
  };
}

/** Call directions, verbatim from `CallDirection`. */
export const CALL_DIRECTIONS = ["Incoming", "Outgoing"] as const;

/** Call types, verbatim from `call_type`'s enum — the answered/unanswered/etc. breakdown. */
export const CALL_TYPES = [
  "OUTGOING_ANSWERED",
  "OUTGOING_UNANSWERED",
  "OUTGOING_BUSY",
  "OUTGOING_FAILED",
  "OUTGOING_RESTRICTED",
  "OUTGOING_BLOCKED",
  "OUTGOING_CANCELLED",
  "INCOMING_ANSWERED",
  "INCOMING_BUSY",
  "INCOMING_FAILED",
  "INCOMING_MISSED",
  "INCOMING_ABANDONED",
  "INCOMING_VOICEMAIL",
] as const;

/** Call traits, verbatim from `call_traits`'s enum. */
export const CALL_TRAITS = [
  "QUEUE",
  "CALLBACK",
  "FORWARD",
  "TRANSFER",
  "MERGE",
  "IVR",
  "VOICE_AGENT",
] as const;

/** DND/DNM/Blacklist list names, verbatim from `UpdateContactStatusDto`. */
export const CONTACT_LISTS = ["blacklist", "dnd", "dnm"] as const;

/** Webhook event types, verbatim from `webhook_list_v21`'s `type` enum. */
export const WEBHOOK_EVENT_TYPES = [
  "call.completed",
  "call.answered",
  "call.initiated",
  "call.incoming",
  "call.updated",
  "call.enters_queue",
  "call.exits_queue",
  "jc.call_ai_generated",
  "call.voicemail",
  "call.missed",
  "call.ai_voice_agent",
  "sms.sent_received",
  "sms.sent",
  "sms.received",
  "sms.status_updated",
  "sd.call_completed",
  "sd.call_updated",
  "sd.call_ai_generated",
  "whatsapp.message_sent",
  "whatsapp.message_received",
  "whatsapp.message_status_updated",
  "appointment.scheduled",
  "jc.contact_status_updated",
] as const;

export function toSelectOptions(
  values: readonly string[],
): Array<{ label: string; value: string }> {
  return values.map((v) => ({ label: v, value: v }));
}

/** The pagination envelope fields, shared by every list action's `output`. */
export const PAGINATION_OUTPUT: OutputField[] = [
  { key: "data", type: "array", label: "Results for this page" },
  { key: "count", type: "number", label: "Number of records on this page" },
  { key: "current_page", type: "number", label: "Current page number" },
  { key: "per_page", type: "number", label: "Records per page" },
  { key: "next_page_link", type: "string", label: "Link to the next page, if any" },
  { key: "prev_page_link", type: "string", label: "Link to the previous page, if any" },
];
