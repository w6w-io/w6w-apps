import type { Param } from "@w6w/types";

/**
 * FreeAgent paginates list endpoints at 25 items per page by default (100 max
 * per page); the full picture (`prev`/`next`/`first`/`last`) also comes back
 * in the response's `Link` header and the total count in `X-Total-Count`,
 * neither of which an Action's typed `output` can surface, so callers that
 * need to page through everything should read `page`/`perPage` themselves.
 */
export const page: Param = {
  key: "page",
  label: "Page",
  type: "number",
  advanced: true,
  validation: { min: 1, integer: true },
};

export const perPage: Param = {
  key: "perPage",
  label: "Per page",
  type: "number",
  advanced: true,
  validation: { min: 1, max: 100, integer: true },
  hint: "Defaults to 25. Maximum 100.",
};

export const updatedSince: Param = {
  key: "updatedSince",
  label: "Updated since",
  type: "datetime",
  advanced: true,
  hint: "ISO 8601. Only return items updated on or after this time.",
};

export const fromDate: Param = {
  key: "fromDate",
  label: "From date",
  type: "date",
  advanced: true,
};

export const toDate: Param = {
  key: "toDate",
  label: "To date",
  type: "date",
  advanced: true,
};
