import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Trustpilot actions.
 *
 * Every field, default and hint here is copied from Trustpilot's own reference pages
 * (`developers.trustpilot.com`), read on 2026-09-01 — not inferred from a sibling
 * integration.
 */

/**
 * Every Business Units / Product Reviews endpoint this app calls addresses one Business
 * Unit by id. Trustpilot's own guidance: "In most cases, your Business Unit ID does not
 * change... you should store your Business Unit ID somewhere in your system" — so it is
 * an action param here (found once via `business-unit-find`), not folded into a
 * Connection field, since one API key can reach more than one Business Unit.
 */
export const businessUnitIdParam: Param = {
  key: "businessUnitId",
  label: "Business Unit ID",
  type: "string",
  required: true,
  placeholder: "4bf2b69100006400050ce5ee",
  hint: "Find it with the “Find Business Unit” action (pass your domain), or from Trustpilot " +
    "Business → Manage Business → General Settings.",
};

/** `page` / `perPage` — the offset-style pagination most Business Units API lists use. */
export function pageParams(perPageHint: string): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Page to retrieve. A page number past the end returns an empty array rather than " +
        "an error.",
    },
    {
      key: "perPage",
      label: "Results per page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: perPageHint,
    },
  ];
}

/**
 * `stars` and `language` are documented as `array` params (`?stars=5`, `?language=en`),
 * but Trustpilot's reference never shows the multi-value wire form (repeated key vs.
 * comma-joined), so this app exposes them as single-value filters rather than guess at
 * it — pass one value per call, or omit to leave the filter off.
 */
export const starsParam: Param = {
  key: "stars",
  label: "Stars",
  type: "select",
  options: [
    { value: 1, label: "1 star" },
    { value: 2, label: "2 stars" },
    { value: 3, label: "3 stars" },
    { value: 4, label: "4 stars" },
    { value: 5, label: "5 stars" },
  ],
  hint: "Filter to reviews with this exact rating. Trustpilot documents this as a " +
    "multi-value filter but shows no multi-value wire example, so only one rating per " +
    "call is supported here.",
};

export const languageParam: Param = {
  key: "language",
  label: "Language",
  type: "string",
  placeholder: "en",
  hint: "Two-letter language code (e.g. `en`). Trustpilot documents this as a multi-value " +
    "filter but shows no multi-value wire example, so only one language per call is " +
    "supported here.",
};
