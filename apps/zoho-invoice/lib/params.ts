import type { Param } from "@w6w/types";

export const organizationId: Param = {
  key: "organizationId",
  label: "Organization ID",
  type: "string",
  hint: "Zoho Invoice organization id. Falls back to the one recorded when this connection was " +
    "authorized. Run List Organizations to see every id available.",
};

export const recordId: Param = {
  key: "recordId",
  label: "Record ID",
  type: "string",
  required: true,
  hint: "The Zoho Invoice record id.",
};

export const dataFields: Param = {
  key: "fields",
  label: "Fields",
  type: "json",
  required: true,
  hint: 'Field name -> value, e.g. { "contact_name": "Acme Inc" }.',
};

export const pageParams: Param[] = [
  { key: "page", label: "Page", type: "number", default: 1 },
  { key: "per_page", label: "Per page", type: "number", default: 200, hint: "Max 200." },
];

/** What a successful status-transition or delete answers with. */
export const statusOutput = [
  { key: "code", type: "number" as const, label: "Zoho Invoice result code (0 = success)" },
  { key: "message", type: "string" as const, label: "Human-readable result message" },
];
