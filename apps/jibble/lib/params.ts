import type { Param } from "@w6w/types";

/**
 * Shared OData query params, reused by every list action.
 *
 * Jibble's whole API is queried with the standard OData v1 keywords — there is no
 * simplified alternative surface — so these are exposed directly rather than invented
 * afresh per action. See `lib/client.ts`'s module doc for the wire shape and the
 * pagination gotcha (no `@odata.nextLink`; the caller drives `$skip`/`$top` itself).
 */
export function odataListParams(defaultTop = 25): Param[] {
  return [
    {
      key: "filter",
      label: "Filter ($filter)",
      type: "string",
      advanced: true,
      hint: "OData filter expression, e.g. status ne 'Archived'. See Microsoft's OData Query " +
        "Options reference for the operator grammar Jibble implements.",
    },
    {
      key: "select",
      label: "Fields to return ($select)",
      type: "string",
      advanced: true,
      hint: "Comma-separated field names, e.g. id,fullName,email.",
    },
    {
      key: "expand",
      label: "Expand ($expand)",
      type: "string",
      advanced: true,
      hint: "Comma-separated nested objects to inline, e.g. activity($select=id,name).",
    },
    {
      key: "orderBy",
      label: "Order by ($orderby)",
      type: "string",
      advanced: true,
      hint: "e.g. fullName or createdAt desc.",
    },
    {
      key: "top",
      label: "Page size ($top)",
      type: "number",
      default: defaultTop,
      hint: "Jibble returns no next-page link — page forward yourself with Skip below.",
    },
    {
      key: "skip",
      label: "Skip ($skip)",
      type: "number",
      default: 0,
      hint: "Number of matching records to skip before this page starts.",
    },
    {
      key: "count",
      label: "Return total count ($count)",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Adds the total matching record count (not just this page's size) to the output.",
    },
  ];
}
