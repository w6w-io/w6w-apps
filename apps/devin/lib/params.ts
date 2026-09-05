import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the Devin actions.
 *
 * Every enum here is copied verbatim from the embedded OpenAPI schema on
 * Devin's own API reference pages (`docs.devin.ai/api-reference/v3/...`,
 * fetched 2026-09-05), not inferred or guessed at.
 */

/** `devin_mode` — which agent mode a session runs under. */
export const devinModeOptions = [
  { value: "normal", label: "Normal — default agent mode" },
  { value: "fast", label: "Fast — ~2x faster, 4x more expensive, same intelligence" },
  { value: "lite", label: "Lite" },
  { value: "ultra", label: "Ultra" },
  { value: "fusion", label: "Fusion" },
];

/** `status` — a session's lifecycle state. */
export const sessionStatusOptions = [
  { value: "new", label: "New" },
  { value: "claimed", label: "Claimed" },
  { value: "running", label: "Running" },
  { value: "exit", label: "Exited" },
  { value: "error", label: "Error" },
  { value: "suspended", label: "Suspended" },
  { value: "resuming", label: "Resuming" },
];

/** `category` — Devin's own use-case classification for a session, once assigned. */
export const sessionCategoryOptions = [
  { value: "bug_fixing", label: "Bug fixing" },
  { value: "ci_cd_and_devops", label: "CI/CD and DevOps" },
  { value: "code_quality_and_security", label: "Code quality and security" },
  { value: "code_review", label: "Code review" },
  { value: "code_review_and_analysis", label: "Code review and analysis" },
  { value: "data_and_automation", label: "Data and automation" },
  { value: "documentation_and_content", label: "Documentation and content" },
  { value: "feature_development", label: "Feature development" },
  { value: "migrations_and_upgrades", label: "Migrations and upgrades" },
  { value: "other", label: "Other" },
  { value: "production_investigation", label: "Production investigation" },
  { value: "refactoring_and_optimization", label: "Refactoring and optimization" },
  { value: "research_and_exploration", label: "Research and exploration" },
  { value: "security", label: "Security" },
  { value: "unit_test_generation", label: "Unit test generation" },
];

/** `origin` — where a session was created from. */
export const sessionOriginOptions = [
  { value: "webapp", label: "Web app" },
  { value: "slack", label: "Slack" },
  { value: "teams", label: "Microsoft Teams" },
  { value: "api", label: "API" },
  { value: "linear", label: "Linear" },
  { value: "jira", label: "Jira" },
  { value: "automation", label: "Automation" },
  { value: "cli", label: "CLI" },
  { value: "desktop", label: "Desktop" },
  { value: "code_scan", label: "Code scan" },
  { value: "other", label: "Other" },
];

/** `type` on a secret — `key-value` covers ordinary env-style secrets. */
export const secretTypeOptions = [
  { value: "key-value", label: "Key/value — an ordinary secret string" },
  { value: "cookie", label: "Cookie" },
  { value: "totp", label: "TOTP — a time-based one-time-password seed" },
];

export const devinIdParam: Param = {
  key: "devinId",
  label: "Session ID",
  type: "string",
  required: true,
  placeholder: "devin-abc123def456",
  hint:
    "The `devin-`-prefixed session id, from the `session_id` field of a create/list/get response.",
};

/** The `after`/`first` cursor-pagination pair every Devin list endpoint takes. */
export function cursorParams(defaultLimit = 100): Param[] {
  return [
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "Pass the previous page's `nextCursor` to continue. Leave empty for the first page.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { integer: true, min: 1, max: 200 },
      hint: "Devin's own default is 100, maximum 200.",
    },
  ];
}
