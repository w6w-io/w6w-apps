import type { Param } from "@w6w/types";

export const orgId: Param = {
  key: "orgId",
  label: "Organization ID",
  type: "string",
  hint: "Zoho Desk orgId. Falls back to the one recorded when this connection was authorized. " +
    "Run List Organizations to see every id available.",
};

export const recordId: Param = {
  key: "recordId",
  label: "Record ID",
  type: "string",
  required: true,
  hint: "The Zoho Desk record id.",
};

export const ticketId: Param = {
  key: "ticketId",
  label: "Ticket ID",
  type: "string",
  required: true,
  hint: "The Zoho Desk ticket id.",
};

export const dataFields: Param = {
  key: "fields",
  label: "Fields",
  type: "json",
  required: true,
  hint: 'Field name -> value, e.g. { "subject": "Cannot log in", "departmentId": "123" }.',
};

export const pageParams: Param[] = [
  { key: "from", label: "From", type: "number", default: 1, hint: "Offset, 1-based." },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 10,
    hint: "Max varies by endpoint; up to 100 for tickets.",
  },
];

/** What a successful delete/move-to-trash answers with — Desk itself returns 204 No Content. */
export const deleteOutput = [
  { key: "deleted", type: "boolean" as const, label: "Deleted" },
];
