import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Affinity actions. Field/enum values are
 * copied from `api-docs.affinity.co` (fetched 2026-09-05), not inferred.
 */

export const personIdPathParam: Param = {
  key: "personId",
  label: "Person ID",
  type: "number",
  required: true,
  validation: { integer: true },
};

export const organizationIdPathParam: Param = {
  key: "organizationId",
  label: "Organization ID",
  type: "number",
  required: true,
  validation: { integer: true },
};

export const opportunityIdPathParam: Param = {
  key: "opportunityId",
  label: "Opportunity ID",
  type: "number",
  required: true,
  validation: { integer: true },
};

export const listIdPathParam: Param = {
  key: "listId",
  label: "List ID",
  type: "number",
  required: true,
  validation: { integer: true },
  hint: "Find it in the list's URL: affinity.affinity.co/lists/{list_id}, or via List Lists.",
};

export const noteIdPathParam: Param = {
  key: "noteId",
  label: "Note ID",
  type: "number",
  required: true,
  validation: { integer: true },
};

export const webhookIdPathParam: Param = {
  key: "webhookSubscriptionId",
  label: "Webhook Subscription ID",
  type: "number",
  required: true,
  validation: { integer: true },
};

/**
 * The cursor-pagination pair used by `GET /persons`, `/organizations`,
 * `/opportunities`, `/notes`, and `GET /lists/{id}/list-entries` (when
 * `page_size` is passed). Vendor default for `page_size` is documented as
 * "the maximum value of 500" on the search endpoints — prefilled lower here
 * so a workflow step doesn't return 500 records by surprise.
 */
export function paginationParams(defaultPageSize: number): Param[] {
  return [
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: defaultPageSize,
      validation: { integer: true, min: 1, max: 500 },
      hint: "How many results per page. Vendor maximum is 500.",
    },
    {
      key: "pageToken",
      label: "Page token",
      type: "string",
      hint: "The next_page_token from a previous response, to fetch the next page.",
    },
  ];
}

/**
 * `min_/max_{interaction}_date` filters, shared by Search Persons and Search
 * Organizations. Affinity documents seven interaction types; all seven share
 * the same min/max shape.
 */
export const interactionTypeOptions = [
  { value: "first_email", label: "First email" },
  { value: "last_email", label: "Last email" },
  { value: "last_interaction", label: "Last interaction (any kind)" },
  { value: "last_event", label: "Last meeting/event" },
  { value: "first_event", label: "First meeting/event" },
  { value: "next_event", label: "Next meeting/event" },
];

export const withInteractionDatesParam: Param = {
  key: "withInteractionDates",
  label: "Include interaction dates",
  type: "boolean",
  hint: "Only entities with at least one interaction are returned when this is on.",
};

export const withInteractionPersonsParam: Param = {
  key: "withInteractionPersons",
  label: "Include interaction persons",
  type: "boolean",
  hint: "Requires 'Include interaction dates'. Adds the internal people tied to each interaction.",
};

export const withOpportunitiesParam: Param = {
  key: "withOpportunities",
  label: "Include opportunity IDs",
  type: "boolean",
};

/** Field Entity Types — shared by Fields and the field-value-changes filters. */
export const fieldEntityTypeOptions = [
  { value: "0", label: "Person" },
  { value: "1", label: "Organization" },
  { value: "8", label: "Opportunity" },
];

/**
 * Field Value Types — the `value_type` of a field, per the Field Resource
 * table. Note 2 and 6 are both text-shaped ("Text or Dropdown" vs plain long
 * "Text") — copied verbatim rather than collapsed, since the docs themselves
 * keep them distinct.
 */
export const fieldValueTypeOptions = [
  { value: "0", label: "Person" },
  { value: "1", label: "Organization" },
  { value: "2", label: "Text or Dropdown" },
  { value: "3", label: "Number" },
  { value: "4", label: "Date" },
  { value: "5", label: "Location" },
  { value: "6", label: "Text (long)" },
  { value: "7", label: "Ranked Dropdown" },
];
