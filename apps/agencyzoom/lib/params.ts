import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the AgencyZoom actions. Every
 * enum here is copied verbatim from AgencyZoom's OpenAPI 3.0 document
 * (`app.agencyzoom.com/openapi/agencyzoom.yaml`, fetched 2026-09-05), not
 * inferred.
 */

/** `page` / `pageSize` — every search endpoint's offset paging. */
export function pageParams(maxPageSize: number, defaultPageSize = 20): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 0,
      hint: "0-indexed. AgencyZoom's own default.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: defaultPageSize,
      hint: `AgencyZoom's own maximum for this endpoint is ${maxPageSize}.`,
      validation: { integer: true, min: 1, max: maxPageSize },
    },
  ];
}

/** `Lead.status` / `LeadSearchRequest.status`. */
export const leadStatusOptions = [
  { value: 0, label: "New" },
  { value: 1, label: "Quoted" },
  { value: 2, label: "Won" },
  { value: 3, label: "Lost" },
  { value: 4, label: "Contacted" },
  { value: 5, label: "Expired" },
];

/**
 * `LeadChangeStatusRequest.status` — a NARROWER set than `Lead.status` above.
 * The vendor's own enum for changing status is `{0, 2, 3, 5}` — "Contacted"
 * (4) and "Quoted" (1) are reached through the dedicated
 * `/leads/{leadId}/status` prose ("Otherwise, it is contact or quoted date")
 * rather than this list, and passing `1` or `4` here is a validation error,
 * not a shorthand for those flows.
 */
export const leadChangeStatusOptions = [
  { value: 0, label: "Active" },
  { value: 2, label: "Won" },
  { value: 3, label: "Lost" },
  { value: 5, label: "X-Dated" },
];

/** `Task.status` / `TaskSearchRequest.status`. */
export const taskStatusOptions = [
  { value: 0, label: "Open" },
  { value: 1, label: "Completed" },
];

/** `TaskCreateRequest.type`. */
export const taskTypeOptions = [
  { value: "todo", label: "To Do" },
  { value: "email", label: "Send Email" },
  { value: "call", label: "Make Call" },
  { value: "meeting", label: "Schedule Meeting" },
];

/** `Enterprise_PolicyUpdateStatusRequest.status`. */
export const policyStatusOptions = [
  { value: 0, label: "Cancelled" },
  { value: 1, label: "Active" },
  { value: 10, label: "Active — New" },
  { value: 11, label: "Active — Renewed" },
  { value: 12, label: "Active — Reinstated" },
  { value: 13, label: "Active — Rewritten" },
];

/** `pipelines` / `pipelines-and-stages` / `end-stages` `type` query param. */
export const pipelineTypeOptions = [
  { value: "lead", label: "Lead pipeline" },
  { value: "service", label: "Service pipeline" },
];

/**
 * A carrier or product line may be identified by numeric ID *or* by the
 * vendor's own "standard code" — every opportunity/policy/quote schema
 * documents both as alternatives ("Optional if standardCarrierCode is
 * provided"). Both are exposed as plain optional strings/numbers rather than
 * one unioned field, because the host's param resolution has no way to model
 * "exactly one of A or B" — the vendor accepts either and this app passes
 * through whichever the caller filled in.
 */
export const carrierIdParams: Param[] = [
  {
    key: "carrierId",
    label: "Carrier ID",
    type: "number",
    hint: "From List Carriers. Optional if Standard Carrier Code is set instead.",
  },
  {
    key: "standardCarrierCode",
    label: "Standard Carrier Code",
    type: "string",
    hint: "AgencyZoom's own carrier code, for enterprise catalogs. Optional if Carrier ID is set.",
  },
];

export const productLineIdParams: Param[] = [
  {
    key: "productLineId",
    label: "Product Line ID",
    type: "number",
    hint: "From List Product Lines. Optional if Standard Product Line Code is set instead.",
  },
  {
    key: "standardProductLineCode",
    label: "Standard Product Line Code",
    type: "string",
    hint: "AgencyZoom's own product line code, for enterprise catalogs. Optional if Product " +
      "Line ID is set.",
  },
];
