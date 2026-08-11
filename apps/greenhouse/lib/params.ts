import type { OutputField, Param } from "@w6w/types";
import { IDS_MAX, PER_PAGE_DEFAULT, PER_PAGE_MAX } from "./client.ts";

/**
 * Shared `Param` fragments and option lists for the Greenhouse Harvest v3
 * actions.
 *
 * Every enum here is copied field-for-field from Greenhouse's OpenAPI 3.1
 * document for Harvest v3 (read 2026-08-11), not inferred from prose or from
 * another integration. Where the *filter* vocabulary and the *response*
 * vocabulary differ, both are stated — see {@link applicationStatusOptions},
 * which is the one place in this API where they do.
 */

/**
 * The filter/response cursor and page-size controls every v3 list endpoint
 * shares, in the order they should be filled in.
 *
 * `perPage` carries no default on purpose. Greenhouse's default is 100 and its
 * maximum is 500, but a filled-in `per_page` is fatal on a cursor request — the
 * API answers 422 for a cursor sent with any other parameter — so prefilling it
 * would break page two of every paged workflow.
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "perPage",
      label: "Page size",
      type: "number",
      validation: { integer: true, min: 1, max: PER_PAGE_MAX },
      hint:
        `Results per page. Greenhouse's own default is ${PER_PAGE_DEFAULT} and its maximum is ` +
        `${PER_PAGE_MAX}. Leave this empty when you supply a cursor — Greenhouse rejects a ` +
        "cursor sent with any other parameter.",
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint:
        "Opaque page cursor from a previous run's `nextCursor` output. When set it must be the " +
        "ONLY thing you fill in on this step: clear every filter and the page size, because the " +
        "cursor already carries them. Never edit or construct one by hand.",
    },
  ];
}

/** `ids=1,2,3` — the direct-fetch filter every list endpoint accepts. */
export const idsParam: Param = {
  key: "ids",
  label: "Ids",
  type: "string",
  placeholder: "12345,12346",
  hint: `Comma-separated ids to fetch directly, at most ${IDS_MAX} per request. This is how v3 ` +
    "replaces v1's per-id retrieve endpoints: there is no `GET /v3/candidates/{id}`, you filter " +
    "the list by id instead.",
};

/**
 * The four comparison operators v3 accepts on a date filter.
 *
 * They are sent as `created_at=gte|2024-01-01T00:00:00Z`, not as a bracketed
 * sub-key and not as a bare timestamp.
 */
export const dateOperatorOptions = [
  { value: "gte", label: "On or after (gte)" },
  { value: "gt", label: "After (gt)" },
  { value: "lte", label: "On or before (lte)" },
  { value: "lt", label: "Before (lt)" },
];

/**
 * A `<field>` date filter as an operator + timestamp pair.
 *
 * Both halves are required for the filter to be sent; a half-filled pair is
 * dropped rather than guessed at, so a form left mid-edit does not 422.
 *
 * Greenhouse's own guidance is not to combine `created_at` with `updated_at` in
 * one request, which is why each caller offers one or the other and never both.
 */
export function dateFilterParams(
  key: string,
  label: string,
  hint: string,
): Param[] {
  return [
    {
      key: `${key}Operator`,
      label: `${label} — comparison`,
      type: "select",
      options: dateOperatorOptions,
      hint: "Only takes effect together with the timestamp below.",
    },
    {
      key: key,
      label: label,
      type: "datetime",
      hint: hint,
    },
  ];
}

/**
 * The standard `created_at` filter pair, shared by every list endpoint.
 *
 * The vendor's note — do not use `created_at` and `updated_at` in the same
 * request — is why the actions expose one filter pair rather than two.
 */
export function createdAtParams(): Param[] {
  return dateFilterParams(
    "createdAt",
    "Created at",
    "Filter by creation time. Greenhouse asks that you do not combine a created-at filter with " +
      "an updated-at filter in one request, so this is the only date filter offered here.",
  );
}

/** `updated_at` — the incremental-sync filter, offered instead of `created_at`. */
export function updatedAtParams(): Param[] {
  return dateFilterParams(
    "updatedAt",
    "Updated at",
    "Filter by last-modified time — the usual choice for an incremental sync. Do not combine " +
      "with a created-at filter in the same request.",
  );
}

/**
 * `fields=a,b,c` — trim the response to named attributes.
 *
 * Left as free text rather than a multiselect because the accepted values are a
 * different enum per resource (the application enum has 24 members, the office
 * enum 6), and an option list copied per action would be four hundred lines of
 * duplication that drifts the first time Greenhouse adds an attribute.
 */
export const fieldsParam: Param = {
  key: "fields",
  label: "Fields",
  type: "string",
  hint:
    "Comma-separated attribute names to return instead of the full object, at most 50. Accepted " +
    "names differ per resource — see that resource's query-parameter documentation. Leave empty " +
    "for everything.",
};

/**
 * The output shape every list action returns.
 *
 * `nextCursor` is a first-class output because it is the *only* way to reach
 * page two: a v3 list body is a bare array with no page metadata in it at all.
 */
export function listOutput(itemsLabel: string): OutputField[] {
  return [
    { key: "items", type: "array", label: itemsLabel },
    { key: "hasMore", type: "boolean", label: "Another page exists" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
    { key: "nextUrl", type: "string", label: "Next-page URL as Greenhouse sent it" },
    { key: "rateLimit", type: "object", label: "X-RateLimit-Limit / Remaining / Reset" },
  ];
}

/**
 * Application lifecycle status — **the filter and the response disagree**.
 *
 * The OpenAPI document gives the `status` *query parameter* the enum
 * `rejected | hired | converted | active`, and the `status` *response property*
 * the enum `rejected | hired | converted | in_process`. Same field name, same
 * endpoint, one member spelled two ways: you filter for `active` and every row
 * that comes back says `in_process`.
 *
 * Both halves of that bite. Filtering `status=in_process` is a 422, and a
 * downstream step comparing the returned `status` to `active` never matches.
 * The option label below states the response spelling so the mismatch is visible
 * at the point where someone picks the value.
 */
export const applicationStatusOptions = [
  { value: "active", label: "Active — in process (returned as `in_process`)" },
  { value: "rejected", label: "Rejected" },
  { value: "hired", label: "Hired" },
  { value: "converted", label: "Converted — prospect promoted to a candidate" },
];

/** `status` on a job. Filter and response agree here. */
export const jobStatusOptions = [
  { value: "open", label: "Open" },
  { value: "draft", label: "Draft" },
  { value: "closed", label: "Closed" },
];

/** `status` on an offer. Capitalised by the vendor — `Created`, not `created`. */
export const offerStatusOptions = [
  { value: "Created", label: "Created — drafted or pending approval" },
  { value: "Accepted", label: "Accepted" },
  { value: "Rejected", label: "Rejected" },
  { value: "Deprecated", label: "Deprecated — superseded by a newer version" },
];

/** `status` on a scheduled interview. */
export const interviewStatusOptions = [
  { value: "to_be_scheduled", label: "To be scheduled" },
  { value: "scheduled", label: "Scheduled" },
  { value: "awaiting_feedback", label: "Awaiting feedback" },
  { value: "complete", label: "Complete" },
  { value: "skipped", label: "Skipped" },
  { value: "collect_feedback", label: "Collect feedback" },
  { value: "to_be_sent", label: "To be sent" },
  { value: "sent", label: "Sent" },
  { value: "received", label: "Received" },
];

/** `status` on a scorecard. */
export const scorecardStatusOptions = [
  { value: "draft", label: "Draft — started, not submitted" },
  { value: "complete", label: "Complete — submitted" },
];

/** `type` on an attachment. */
export const attachmentTypeOptions = [
  { value: "resume", label: "Résumé" },
  { value: "cover_letter", label: "Cover letter" },
  { value: "take_home_test", label: "Take-home test" },
  { value: "offer_packet", label: "Offer packet" },
  { value: "offer_letter", label: "Offer letter" },
  { value: "signed_offer_letter", label: "Signed offer letter" },
  { value: "form_attachment", label: "Form attachment" },
  { value: "midfunnel_agreement", label: "Mid-funnel agreement" },
  { value: "automated_agreement", label: "Automated agreement" },
  { value: "other", label: "Other" },
];

/** `type` on a note. Only three of these can be *created* — see `create-note`. */
export const noteTypeOptions = [
  { value: "NOTE", label: "Note" },
  { value: "ACTIVITY", label: "Activity feed entry" },
  { value: "EMAIL", label: "Logged e-mail" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "FOLLOW_UP", label: "Follow-up" },
  { value: "TAKE_HOME_TEST", label: "Take-home test" },
  { value: "LINKEDIN_NOTE", label: "LinkedIn note" },
  { value: "LINKEDIN_INMAIL", label: "LinkedIn InMail" },
  { value: "AVAILABILITY_REQUEST", label: "Availability request" },
  { value: "MIGRATION_ERROR", label: "Migration error" },
  { value: "TOUCHPOINT", label: "Touchpoint" },
  { value: "FORM", label: "Form" },
  { value: "FEEDBACK", label: "Feedback" },
];

/**
 * `visibility` — and this one is spelled differently on the way in and the way
 * out, which is the second read/write vocabulary split in this API.
 *
 * `GET /v3/notes` filters and returns `admin_only_visible | privately_visible |
 * publicly_visible`. `POST /v3/notes` requires `admin_only | private | public`.
 * The two lists are kept apart below rather than merged, because sending a
 * filter spelling to the create endpoint is a 422.
 */
export const noteVisibilityFilterOptions = [
  { value: "publicly_visible", label: "Public" },
  { value: "privately_visible", label: "Private" },
  { value: "admin_only_visible", label: "Admin only" },
];

/** The create-side spelling of the same three values. */
export const noteVisibilityWriteOptions = [
  { value: "public", label: "Public — anyone with access to the candidate" },
  { value: "private", label: 'Private — requires the "see private notes" permission' },
  { value: "admin_only", label: "Admin only — Job Admins and Site Admins" },
];

/** Contact-detail sub-types, shared by the candidate create/update actions. */
export const phoneTypeOptions = ["home", "work", "mobile", "skype", "other"].map((v) => ({
  value: v,
  label: v,
}));

export const emailTypeOptions = ["personal", "work", "other"].map((v) => ({ value: v, label: v }));
