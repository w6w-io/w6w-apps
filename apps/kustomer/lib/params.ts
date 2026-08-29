import type { Param } from "@w6w/types";

/** Kustomer's page-number pagination — verified against the vendor's Pagination reference page. */
export const pagination: Param[] = [
  {
    key: "page",
    label: "Page",
    type: "number",
    default: 1,
    row: "page",
    validation: { min: 1, integer: true },
  },
  {
    key: "pageSize",
    label: "Page size",
    type: "number",
    default: 100,
    row: "page",
    advanced: true,
    validation: { min: 1, max: 100, integer: true },
    hint: "Kustomer's default and maximum page size is 100 for most list endpoints.",
  },
];

/** A single-record response envelope: `{"data": {"type", "id", "attributes", ...}}`. */
export const recordOutput = [
  { key: "data", type: "object" as const, label: "Record" },
];

/** A list response envelope: `{"data": [...], "meta": {...}, "links": {...}}`. */
export const listOutput = [
  { key: "data", type: "array" as const, label: "Records" },
  { key: "meta", type: "object" as const, label: "Pagination metadata" },
  { key: "links", type: "object" as const, label: "Pagination links" },
];
