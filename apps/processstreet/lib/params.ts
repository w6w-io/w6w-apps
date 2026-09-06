import type { Param } from "@w6w/types";

/**
 * The opaque `_` cursor, shared by every real cursor-paginated list action. Named `cursor` on the
 * form (not `_`) since a leading underscore reads like a mistake in a UI — mapped back onto the
 * wire's `_` query param at the call site.
 */
export const cursorParams: Param[] = [
  {
    key: "cursor",
    label: "Cursor",
    type: "string",
    advanced: true,
    hint:
      "Opaque pagination cursor from a previous call's `nextCursor` output. Omit for the first page.",
  },
];

export interface CursorInput {
  cursor?: string;
}
