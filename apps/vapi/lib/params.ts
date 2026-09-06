import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Vapi actions.
 *
 * Every field and enum here is copied from Vapi's own OpenAPI document
 * (`https://api.vapi.ai/api-json`, fetched 2026-09-06), not inferred.
 */

/**
 * `limit` — every list endpoint in this app documents the same ceiling:
 * default 100, max 1000. Unlike Apify's pack-wide convention of prefilling a
 * SMALLER-than-vendor default, Vapi's own default of 100 is already a
 * reasonable page size, so it is kept rather than second-guessed.
 */
export const limitParam: Param = {
  key: "limit",
  label: "Limit",
  type: "number",
  default: 100,
  validation: { integer: true, min: 0, max: 1000 },
  hint: "Maximum items to return. Vapi's own default is 100, maximum 1000.",
};

/**
 * The `createdAt`/`updatedAt` range filters every list endpoint accepts —
 * Vapi's ONLY pagination mechanism besides `limit` for these (there is no
 * offset or cursor). Set `*Lt` to the oldest `createdAt` seen in a page to
 * page backward through history.
 */
export function dateRangeParams(): Param[] {
  return [
    {
      key: "createdAtGt",
      label: "Created after",
      type: "datetime",
      hint: "Only items created strictly after this time.",
    },
    {
      key: "createdAtLt",
      label: "Created before",
      type: "datetime",
      hint: "Only items created strictly before this time. Use to page backward through history.",
    },
    {
      key: "createdAtGe",
      label: "Created at/after",
      type: "datetime",
    },
    {
      key: "createdAtLe",
      label: "Created at/before",
      type: "datetime",
    },
    {
      key: "updatedAtGt",
      label: "Updated after",
      type: "datetime",
    },
    {
      key: "updatedAtLt",
      label: "Updated before",
      type: "datetime",
    },
    {
      key: "updatedAtGe",
      label: "Updated at/after",
      type: "datetime",
    },
    {
      key: "updatedAtLe",
      label: "Updated at/before",
      type: "datetime",
    },
  ];
}

export interface DateRangeInput {
  createdAtGt?: string;
  createdAtLt?: string;
  createdAtGe?: string;
  createdAtLe?: string;
  updatedAtGt?: string;
  updatedAtLt?: string;
  updatedAtGe?: string;
  updatedAtLe?: string;
}

/** Build the query fragment for {@link dateRangeParams}. */
export function dateRangeQuery(input: DateRangeInput): Record<string, string | undefined> {
  return {
    createdAtGt: input.createdAtGt,
    createdAtLt: input.createdAtLt,
    createdAtGe: input.createdAtGe,
    createdAtLe: input.createdAtLe,
    updatedAtGt: input.updatedAtGt,
    updatedAtLt: input.updatedAtLt,
    updatedAtGe: input.updatedAtGe,
    updatedAtLe: input.updatedAtLe,
  };
}

/** A required path-segment id param, phrased for the resource at hand. */
export function idParam(label: string, hint?: string): Param {
  return { key: "id", label, type: "string", required: true, hint };
}
