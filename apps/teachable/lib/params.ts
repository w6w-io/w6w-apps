import type { Param } from "@w6w/types";

/**
 * Shared pagination params.
 *
 * Every paginated action prefills `per` rather than leaving it unset, because
 * the vendor's own docs disagree on what the default is when it is left unset
 * — 25 per the pagination guide, 20 per `/v1/courses`' own OpenAPI
 * description, 5 per `/v1/pricing_plans`'. See `lib/client.ts`.
 */
export function paginationParams(defaultPer: number, maxNote: string): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "Page number to return, starting at 1.",
    },
    {
      key: "per",
      label: "Results per page",
      type: "number",
      default: defaultPer,
      hint: maxNote,
    },
  ];
}
