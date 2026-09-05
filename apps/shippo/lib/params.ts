import type { Param } from "@w6w/types";

/** Paging, shared by the list actions. Shippo caps `results` at 100 per page. */
export const LIST_PARAMS: Param[] = [
  {
    key: "results",
    label: "Results per page",
    type: "number",
    default: 20,
    advanced: true,
    hint: "Shippo caps a page at 100.",
    validation: { max: 100, integer: true },
  },
  {
    key: "page",
    label: "Page",
    type: "number",
    default: 1,
    advanced: true,
    hint: "Page number to fetch, starting at 1.",
  },
];

/** An address given inline as JSON, or by a previously-created `object_id`. */
export const addressParam = (key: string, label: string, hint: string): Param => ({
  key,
  label,
  type: "json",
  required: true,
  default: "",
  hint,
});
