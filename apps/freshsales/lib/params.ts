import type { Param } from "@w6w/types";

/**
 * Freshsales's page-number pagination for a `view` listing — the docs'
 * "Pagination" section states the default page size is 25. `per_page` is
 * accepted there too (verified against a `.../view/3?per_page=25` example
 * elsewhere in the docs); the 100 cap itself is only stated explicitly for
 * the `/search` endpoint, so it is carried here as a sane upper bound rather
 * than a vendor-confirmed one for view listings specifically.
 */
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
    key: "perPage",
    label: "Per page",
    type: "number",
    default: 25,
    row: "page",
    advanced: true,
    validation: { min: 1, max: 100, integer: true },
    hint: "Freshsales defaults to 25 per page. 100 is carried as an upper bound (confirmed for " +
      "/search; not explicitly re-stated for view listings).",
  },
];

/**
 * Listing a Freshsales resource always goes through a saved *view* — there is
 * no flat "list everything" endpoint (verified: "List All Contacts" is
 * `/api/contacts/view/[view_id]`, not `/api/contacts`). Use the "List Views"
 * action first to find the id of a view such as the account's built-in
 * "All Contacts" — view ids are per-account, never a fixed constant.
 */
export function viewIdParam(resourceLabel: string): Param {
  return {
    key: "viewId",
    label: "View ID",
    type: "number",
    required: true,
    hint:
      `The saved view to list ${resourceLabel} from. Use the "List Views" action to find one — ` +
      "view ids are per-account and not fixed constants.",
  };
}

/** The three objects a Note (and a few other endpoints) can attach to. */
export const targetableTypeOptions = [
  { value: "Contact", label: "Contact" },
  { value: "SalesAccount", label: "Account" },
  { value: "Deal", label: "Deal" },
];

export const contactOutput = [
  { key: "id", type: "number" as const, label: "Contact ID" },
  { key: "first_name", type: "string" as const, label: "First name" },
  { key: "last_name", type: "string" as const, label: "Last name" },
  { key: "display_name", type: "string" as const, label: "Display name" },
  { key: "email", type: "string" as const, label: "Email" },
];

export const accountOutput = [
  { key: "id", type: "number" as const, label: "Account ID" },
  { key: "name", type: "string" as const, label: "Name" },
  { key: "website", type: "string" as const, label: "Website" },
  { key: "phone", type: "string" as const, label: "Phone" },
];

export const dealOutput = [
  { key: "id", type: "number" as const, label: "Deal ID" },
  { key: "name", type: "string" as const, label: "Name" },
  { key: "amount", type: "string" as const, label: "Amount" },
  { key: "expected_close", type: "string" as const, label: "Expected close" },
];
