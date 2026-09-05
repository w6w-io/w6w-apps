import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Wise actions.
 *
 * Every shape here is transcribed from Wise's OpenAPI 3.1 bundle (fetched
 * 2026-09-05 from `docs.wise.com/_bundle/api-reference/@latest/index.json`),
 * not inferred.
 */

export const profileIdParam: Param = {
  key: "profileId",
  label: "Profile ID",
  type: "number",
  required: true,
  validation: { integer: true },
  hint:
    "Personal or business profile ID — from the profile-list action, or Wise.com account settings.",
};

export const sourceCurrencyParam: Param = {
  key: "sourceCurrency",
  label: "Source currency",
  type: "string",
  required: true,
  placeholder: "GBP",
  hint: "3-letter ISO 4217 code of the currency being sent.",
};

export const targetCurrencyParam: Param = {
  key: "targetCurrency",
  label: "Target currency",
  type: "string",
  required: true,
  placeholder: "USD",
  hint: "3-letter ISO 4217 code of the currency being received.",
};

/**
 * `payOut` / `preferredPayIn`. Wise documents these as open-ended strings —
 * "Examples of other accepted values include `BALANCE`, `SWIFT`, `SWIFT_OUR`,
 * `ALIPAY`, and `INTERAC`" — rather than a closed enum, so this is `type:
 * "string"` with the documented examples in the hint, not a `select` that
 * would falsely claim to be exhaustive.
 */
export const payOutParam: Param = {
  key: "payOut",
  label: "Payout method",
  type: "string",
  hint: 'Optional. Defaults to "BANK_TRANSFER". Other documented values include BALANCE, SWIFT, ' +
    "SWIFT_OUR (fee charged to the sender for SWIFT recipients), ALIPAY, and INTERAC — the full " +
    "set depends on the currency corridor and is not a closed list.",
};

/** `offset`/`limit` — used by Transfer List. */
export function offsetLimitParams(defaultLimit: number): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { integer: true, min: 1 },
      hint: "Maximum number of records to return.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Starting record number. Defaults to 0.",
    },
  ];
}

/**
 * Recipient List's own pagination: seek-based, not offset-based. `size` caps at
 * 20 (the vendor's own maximum, also its default) and `seekPosition` is opaque
 * — copy it from the previous response's `seekPositionForNext`, never compute it.
 */
export const recipientPaginationParams: Param[] = [
  {
    key: "size",
    label: "Page size",
    type: "number",
    default: 20,
    validation: { integer: true, min: 1, max: 20 },
    hint: "Number of accounts per page. Maximum and default are both 20.",
  },
  {
    key: "seekPosition",
    label: "Seek position",
    type: "number",
    hint:
      "For the next page, pass the previous response's seekPositionForNext. Leave empty for the first page.",
  },
];
