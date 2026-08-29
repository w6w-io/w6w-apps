import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Apollo actions.
 *
 * Every field and enum here is copied from Apollo's own OpenAPI 3.1 document (embedded
 * in `docs.apollo.io/reference/*`, fetched 2026-08-29), not inferred from the product UI.
 */

/** `page` / `per_page`, the pagination pair every search endpoint documents. */
export function paginationParams(defaultPerPage: number, hint?: string): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Page number, starting at 1.",
    },
    {
      key: "per_page",
      label: "Results per page",
      type: "number",
      default: defaultPerPage,
      validation: { integer: true, min: 1 },
      hint: hint ?? "Number of results per page.",
    },
  ];
}

/** An Apollo record id (24-char Mongo-style hex string in practice, but never validated as such). */
export function idParam(key: string, label: string, hint?: string): Param {
  return { key, label, type: "string", required: true, hint };
}

/**
 * The catch-all for a search endpoint's long tail of filters.
 *
 * Every search endpoint in this API documents a dozen-plus optional filters (locations,
 * technology uids, funding ranges, keyword tags, …). Exploding all of them into named
 * params per action would make each file mostly boilerplate, so the handful of filters
 * most workflows actually reach for are named explicitly and everything else is
 * available here as raw query keys, merged in verbatim (bracket-array and `[min]`/`[max]`
 * range keys included) — the same shape `buildQuery`/`appendQuery` in `lib/client.ts`
 * already produce, so a value copied from Apollo's own API reference works unmodified.
 */
export const extraFiltersParam: Param = {
  key: "extraFilters",
  label: "Additional filters",
  type: "json",
  advanced: true,
  hint: 'Any other documented query filter for this endpoint, as `{"key": value}` — arrays and ' +
    "`{min, max}` ranges are sent exactly as Apollo's API reference documents them " +
    '(e.g. `{"person_seniorities": ["director"], "revenue_range": {"min": 1000000}}`). ' +
    "Overrides the named fields above if both set the same key.",
};

/**
 * Parse a `type: "json"` param that should resolve to a plain object, accepting either
 * an already-parsed object or the string a user typed. Used for {@link extraFiltersParam}
 * and for any other free-form "merge these extra fields in" param (e.g. a sequence's
 * `settings`).
 */
export function parseJsonObject(value: unknown, label = "value"): Record<string, unknown> {
  if (value === undefined || value === null || value === "") return {};
  if (typeof value !== "string") return value as Record<string, unknown>;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** `typed_custom_fields` — a free-form object keyed by the account's own custom field ids. */
export const typedCustomFieldsParam: Param = {
  key: "typed_custom_fields",
  label: "Custom fields",
  type: "json",
  advanced: true,
  hint: "Keyed by custom field ID (see the List Custom Fields action), e.g. " +
    '`{"6095a710bd01d100a506d4af": "Enterprise"}`.',
};

export const taskTypeOptions = [
  { value: "call", label: "Call the contact" },
  { value: "outreach_manual_email", label: "Email the contact" },
  { value: "linkedin_step_connect", label: "Send a LinkedIn connection request" },
  { value: "linkedin_step_message", label: "Send a LinkedIn direct message" },
  { value: "linkedin_step_view_profile", label: "View the contact's LinkedIn profile" },
  { value: "linkedin_step_interact_post", label: "Interact with the contact's LinkedIn posts" },
  { value: "action_item", label: "Generic action item" },
];

export const taskPriorityOptions = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

/**
 * Task status. `scheduled` is for future-facing tasks; `completed`/`skipped` record one
 * already done. The dedicated `task-complete`/`task-skip` actions are the normal way to
 * reach those two — this option list exists for `create` and `search`.
 */
export const taskStatusOptions = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" },
];

/** `modality` — the two record kinds a list ("label") can hold. */
export const listModalityOptions = [
  { value: "contacts", label: "Contacts" },
  { value: "accounts", label: "Accounts" },
];
