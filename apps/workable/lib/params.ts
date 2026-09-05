import type { Param } from "@w6w/types";

/**
 * Workable's cursor-ish pagination for `/jobs`, `/candidates` and
 * `/candidates/:id/activities`: `limit` (default 50, vendor max 100) plus
 * `since_id` / `max_id` scroll parameters. `nextUrl` from the previous page's
 * `paging.next` is the recommended way to page — passing it straight back
 * as `pageUrl` skips re-deriving the query.
 */
export const pagination: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 50,
    row: "page",
    validation: { min: 1, max: 100, integer: true },
    hint: "Workable caps this at 100.",
  },
  {
    key: "sinceId",
    label: "Since ID",
    type: "string",
    row: "page",
    advanced: true,
    hint: "Returns results with an ID greater than or equal to this one.",
  },
  {
    key: "maxId",
    label: "Max ID",
    type: "string",
    row: "page",
    advanced: true,
    hint: "Returns results with an ID less than or equal to this one.",
  },
  {
    key: "pageUrl",
    label: "Page URL",
    type: "string",
    advanced: true,
    hint: "`paging.next` from a previous call to this action. When set, every other filter here " +
      "is ignored — Workable already encoded them into this URL.",
  },
];

export const jobOutput = [
  { key: "id", type: "string" as const, label: "Job ID" },
  { key: "title", type: "string" as const, label: "Title" },
  { key: "shortcode", type: "string" as const, label: "Shortcode" },
  { key: "state", type: "string" as const, label: "State" },
  { key: "department", type: "string" as const, label: "Department" },
  { key: "url", type: "string" as const, label: "Job page URL" },
  { key: "application_url", type: "string" as const, label: "Application form URL" },
];

export const candidateOutput = [
  { key: "id", type: "string" as const, label: "Candidate ID" },
  { key: "name", type: "string" as const, label: "Name" },
  { key: "email", type: "string" as const, label: "Email" },
  { key: "headline", type: "string" as const, label: "Headline" },
  { key: "stage", type: "string" as const, label: "Pipeline stage" },
  { key: "disqualified", type: "boolean" as const, label: "Disqualified" },
  { key: "job.shortcode", type: "string" as const, label: "Job shortcode" },
  { key: "profile_url", type: "string" as const, label: "Profile URL" },
];

export const stateOptions = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

/**
 * From `/subscriptions`' own `event` description plus the
 * "Webhook Subscriptions - Candidates & Employees" guide, which lists
 * `candidate_deleted` and `job_deleted` in addition to the endpoint's own
 * enum text — both sources are unioned here since neither alone is complete.
 */
export const webhookEventOptions = [
  { value: "candidate_created", label: "Candidate created" },
  { value: "candidate_moved", label: "Candidate moved" },
  { value: "candidate_deleted", label: "Candidate deleted" },
  { value: "job_deleted", label: "Job deleted" },
  { value: "employee_created", label: "Employee created" },
  { value: "employee_updated", label: "Employee updated" },
  { value: "employee_published", label: "Employee published" },
  { value: "onboarding_completed", label: "Onboarding completed" },
  { value: "timeoff_updated", label: "Timeoff updated" },
];
