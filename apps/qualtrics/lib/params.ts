import type { Param } from "@w6w/types";
import { DEFAULT_MAX_PAGES } from "./client.ts";

/**
 * Qualtrics has no query-parameter pagination scheme to mirror: a list response
 * carries `result.nextPage`, a full URL, and a caller follows it verbatim. An
 * Action cannot hand a URL back as a parameter without inventing one, so every
 * list action instead follows `nextPage` itself, up to this many pages, and
 * returns the remainder's URL as `nextPage` for an operator to inspect.
 */
export const maxPagesParam: Param = {
  key: "maxPages",
  label: "Max pages",
  type: "number",
  default: DEFAULT_MAX_PAGES,
  advanced: true,
  hint:
    `Qualtrics returns \`result.nextPage\` — a full URL — while more results exist. This action ` +
    `follows it up to this many pages (default ${DEFAULT_MAX_PAGES}) and returns the combined list.`,
};

/** A required string identifier, with the hint that says where to find it. */
export function idParam(key: string, label: string, hint: string): Param {
  return { key, label, type: "string", required: true, hint };
}

/** `surveyId`, the identifier most survey-scoped actions take. */
export const surveyIdParam: Param = idParam(
  "surveyId",
  "Survey ID",
  "Starts with `SV_`. Read it from List Surveys, or from a survey's own URL in the Qualtrics UI.",
);
