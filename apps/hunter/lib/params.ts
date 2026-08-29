import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments, copied verbatim from the enumerated values in
 * Hunter's own v2 reference (fetched 2026-08-29), not inferred. Two vendor
 * gotchas worth keeping visible here rather than only in a code comment
 * buried per-action:
 *
 *  - Domain Search's `verification_status` accepts three values (`valid`,
 *    `accept_all`, `unknown`). The Leads `verification_status[]` filter is a
 *    DIFFERENT, wider vocabulary — it adds `invalid`, `webmail`,
 *    `disposable` and `pending`, because it describes a saved lead's stored
 *    verification, not a fresh Domain Search hit.
 *  - Domain Search's `seniority`/`department`/`type` filters are single
 *    comma-delimited STRINGS (`"senior,junior"`); the Leads list endpoint's
 *    equivalent filters are repeated BRACKET-ARRAY params
 *    (`position[]=CEO&position[]=CTO`). Mixing the two up returns a silent
 *    empty result, not an error.
 */

export const domainSearchTypeOptions = [
  { value: "personal", label: "Personal" },
  { value: "generic", label: "Generic (role-based, e.g. contact@)" },
];

export const senorityOptions = [
  { value: "junior", label: "Junior" },
  { value: "senior", label: "Senior" },
  { value: "executive", label: "Executive" },
];

export const departmentOptions = [
  { value: "executive", label: "Executive" },
  { value: "it", label: "IT" },
  { value: "finance", label: "Finance" },
  { value: "management", label: "Management" },
  { value: "sales", label: "Sales" },
  { value: "legal", label: "Legal" },
  { value: "support", label: "Support" },
  { value: "hr", label: "HR" },
  { value: "marketing", label: "Marketing" },
  { value: "communication", label: "Communication" },
  { value: "education", label: "Education" },
  { value: "design", label: "Design" },
  { value: "health", label: "Health" },
  { value: "operations", label: "Operations" },
  { value: "product", label: "Product" },
  { value: "research", label: "Research" },
  { value: "consulting", label: "Consulting" },
  { value: "administrative", label: "Administrative" },
  { value: "procurement", label: "Procurement" },
];

/** Domain Search's own vocabulary — see the file-level note on why this differs from Leads'. */
export const domainSearchVerificationStatusOptions = [
  { value: "valid", label: "Valid" },
  { value: "accept_all", label: "Accept-all" },
  { value: "unknown", label: "Unknown" },
];

/** Leads' wider vocabulary — see the file-level note on why this differs from Domain Search's. */
export const leadVerificationStatusOptions = [
  { value: "valid", label: "Valid" },
  { value: "accept_all", label: "Accept-all" },
  { value: "invalid", label: "Invalid" },
  { value: "unknown", label: "Unknown" },
  { value: "webmail", label: "Webmail" },
  { value: "disposable", label: "Disposable" },
  { value: "pending", label: "Pending" },
];

export const leadSyncStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "error", label: "Error" },
  { value: "success", label: "Success" },
];

/**
 * The offset/limit pair most list endpoints share. The default is
 * deliberately conservative rather than the vendor's own (Domain Search's
 * true default is already a small 10, but the Leads endpoints default to a
 * wider 20 and top out at 1,000) — each call site states its own vendor
 * default and ceiling in its `hint`.
 */
export function paginationParams(defaultLimit: number, hint: string): Param[] {
  return [
    { key: "limit", label: "Limit", type: "number", default: defaultLimit, hint },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      hint: "Number of records to skip.",
    },
  ];
}
