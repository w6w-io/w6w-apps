import type { Param } from "@w6w/types";

/** `page`/`perPage`, shared by every list-shaped action. Verified against every `listX` operation's own Query Parameters table — all of them expose exactly these two, 1-indexed, `perPage` capped at 100. */
export const pageParams: Param[] = [
  {
    key: "page",
    label: "Page",
    type: "number",
    advanced: true,
    hint: "1-indexed. Defaults to the first page.",
    validation: { min: 1, integer: true },
  },
  {
    key: "perPage",
    label: "Per page",
    type: "number",
    advanced: true,
    hint: "Between 1 and 100. Defaults to 50.",
    validation: { min: 1, max: 100, integer: true },
  },
];

export interface PageInput {
  page?: number;
  perPage?: number;
}

/** Shared query fragment for `page`/`perPage`. */
export function pageQuery(input: PageInput): Record<string, number | undefined> {
  return { page: input.page, perPage: input.perPage };
}
