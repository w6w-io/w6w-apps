import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Recruitee actions. Every option list below
 * is copied verbatim from the "URI Parameters" block of the matching resource
 * in `apidocs.recruitee.com` (fetched and parsed 2026-09-05) — see
 * `lib/client.ts` for why that document is trusted only for the resources
 * this app independently verified live.
 */

export const sortOrderOptions = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

/** `List all candidates` — "Sorting options: by_date, by_last_message". */
export const candidateSortOptions = [
  { value: "by_date", label: "By date (default)" },
  { value: "by_last_message", label: "By last message" },
];

/** `List offers` — the documented `statuses` filter values. */
export const offerStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "internal", label: "Internal" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

/** `List tasks for company` — "Limits tasks to 'my', 'unassigned' or 'all'". */
export const taskScopeOptions = [
  { value: "my", label: "My tasks" },
  { value: "unassigned", label: "Unassigned" },
  { value: "all", label: "All" },
];

/** `List tasks for company` — "Limits tasks to 'completed' or 'uncompleted'". */
export const taskStatusOptions = [
  { value: "completed", label: "Completed" },
  { value: "uncompleted", label: "Uncompleted" },
];

/** `List tasks for company` — "Order tasks by, 'due_date', 'created_at', 'completed_at'". */
export const taskSortByOptions = [
  { value: "due_date", label: "Due date" },
  { value: "created_at", label: "Created at" },
  { value: "completed_at", label: "Completed at" },
];

/** `List candidate tags` — "One of: [name taggings_count]". */
export const tagSortByOptions = [
  { value: "name", label: "Name" },
  { value: "taggings_count", label: "Usage count (taggings_count)" },
];

export const candidateIdParam: Param = {
  key: "candidateId",
  label: "Candidate ID",
  type: "number",
  required: true,
  validation: { integer: true, min: 1 },
  hint: "Take it from the `id` field of a candidate returned by List/Show/Create Candidate.",
};

export const offerIdParam: Param = {
  key: "offerId",
  label: "Job Offer ID",
  type: "number",
  required: true,
  validation: { integer: true, min: 1 },
  hint: "Take it from the `id` field of an offer returned by List/Show/Create Offer.",
};

/** `page`/`limit` — used by List Offers and List Tasks. */
export function pageParams(): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
      hint: "Page number (1, 2, 3, …).",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Results per page.",
    },
  ];
}
