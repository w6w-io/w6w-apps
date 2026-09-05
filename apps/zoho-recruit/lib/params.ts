import type { Param } from "@w6w/types";

export const recordId: Param = {
  key: "recordId",
  label: "Record ID",
  type: "string",
  required: true,
  hint: "The Zoho Recruit record id.",
};

export const dataFields: Param = {
  key: "fields",
  label: "Fields",
  type: "json",
  required: true,
  hint: 'Field API name -> value, e.g. { "Last_Name": "Smith", "Email": "a@b.com" }.',
};

/**
 * Unlike Zoho CRM's identically-shaped Get Records endpoint (required
 * `fields`, no "everything" default — see this pack's `zoho` app), Zoho
 * Recruit's own parameter table documents `fields` as `(optional)`. Left
 * unset, so every list/get/search action here works without the caller
 * having to look up field API names first.
 */
export const listFields: Param = {
  key: "fields",
  label: "Fields",
  type: "string",
  hint: "Comma-separated field API names. Optional — omit to get Zoho Recruit's default field set.",
};

export const pageParams: Param[] = [
  { key: "page", label: "Page", type: "number", default: 1 },
  { key: "per_page", label: "Per page", type: "number", default: 200, hint: "Max 200." },
];

/** What a successful create/update/delete/note write answers with. */
export const writeOutput = [
  { key: "code", type: "string" as const, label: "Result code" },
  { key: "status", type: "string" as const, label: "success | error" },
  { key: "details", type: "object" as const, label: "Record id, timestamps and owner" },
  { key: "message", type: "string" as const, label: "Human-readable result message" },
];
