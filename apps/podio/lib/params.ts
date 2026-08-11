import type { Param } from "@w6w/types";

/**
 * Params reused across actions.
 *
 * Two things are centralised here rather than copied per action: the
 * hierarchy's identifiers (org -> space -> app -> item), and the pair of
 * write-side switches Podio puts on *every* mutating endpoint.
 */

/** `org_id`. Podio's own term; the UI calls it an organization. */
export const orgIdParam: Param = {
  key: "orgId",
  label: "Organization ID",
  type: "string",
  required: true,
  hint: "Numeric org id. Use List Organizations to find it — the org's URL slug is not the id.",
};

/**
 * `space_id`. The API says "space" everywhere; the Podio UI says "workspace".
 * Both names appear in the label so neither reader is left guessing.
 */
export const spaceIdParam: Param = {
  key: "spaceId",
  label: "Workspace (Space) ID",
  type: "string",
  required: true,
  hint: "Numeric space id. The API calls a workspace a “space”. List Organizations returns " +
    "the spaces you are a member of; List Workspaces returns all of an org's.",
};

/** `app_id` — a Podio *app*, i.e. a user-defined record type, not this package. */
export const appIdParam: Param = {
  key: "appId",
  label: "App ID",
  type: "string",
  required: true,
  hint: "Numeric id of the Podio app (the record type — e.g. “Leads”), not of this " +
    "integration. Use List Apps in Workspace, or read it from the app's URL in Podio.",
};

export const itemIdParam: Param = {
  key: "itemId",
  label: "Item ID",
  type: "string",
  required: true,
  hint: "Numeric item_id. This is not the app_item_id shown in the Podio UI as “#12”.",
};

/**
 * The reference vocabulary Podio uses for every polymorphic endpoint.
 *
 * Each endpoint accepts a *different subset*, and the vendor lists the subset
 * on the operation page rather than centrally — so this returns a filtered
 * param instead of exposing one universal list that would 404 half the time.
 */
export function refTypeParam(
  allowed: readonly string[],
  hint: string,
  key = "refType",
  label = "Reference type",
): Param {
  return {
    key,
    label,
    type: "select",
    required: true,
    options: allowed.map((v) => ({ value: v, label: v })),
    validation: { enum: [...allowed] },
    hint,
  };
}

export function refIdParam(key = "refId", label = "Reference ID"): Param {
  return {
    key,
    label,
    type: "string",
    required: true,
    hint: "Numeric id of the referenced object, matching the reference type above.",
  };
}

/**
 * `hook` and `silent`, the two switches Podio documents on every write.
 *
 * They are worth surfacing rather than hiding, because a workflow writing back
 * into Podio is the classic source of a webhook loop: an item created by this
 * app fires `item.create`, which triggers the workflow that created it. `hook`
 * is the documented off-switch, defaulting — as Podio does — to `true`.
 *
 * `silent` is the other half: it keeps a bulk write from burying every
 * workspace member's activity stream under a hundred notifications.
 *
 * Both are `advanced` so they do not crowd the front of the form, and neither
 * carries a `default` — omitting the parameter and sending Podio's documented
 * default are the same request, and prefilling would only invite someone to
 * think the app had chosen a value.
 */
export function writeSwitchParams(): Param[] {
  return [
    {
      key: "hook",
      label: "Fire webhooks",
      type: "boolean",
      advanced: true,
      hint: "Podio defaults to true. Set false when this write would trigger the very webhook " +
        "that started this workflow.",
    },
    {
      key: "silent",
      label: "Silent",
      type: "boolean",
      advanced: true,
      hint: "Podio defaults to false. True keeps the change out of the activity stream and " +
        "suppresses notifications — worth setting for bulk writes.",
    },
  ];
}

/** `limit` / `offset`, the pagination pair on Podio's list endpoints. */
export function pagingParams(
  defaultLimit: number,
  limitHint: string,
  max?: number,
): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: max ? { integer: true, min: 1, max } : { integer: true, min: 1 },
      hint: limitHint,
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Podio paginates by offset only — there is no cursor. Advance by the limit.",
    },
  ];
}

/**
 * The `fields` map, the shape this whole integration is organised around.
 *
 * It is a `json` param and not a generated form, and that is a deliberate,
 * costly choice rather than an omission. A Podio app's fields are defined by
 * whoever built the app, so the only way to render them as real form controls
 * would be a dynamic `options.source` hook per field — and the param model has
 * no per-*form* generator, only per-*option-list* ones. Faking it by guessing a
 * flat `{ "field": "value" }` shape would silently drop an end date, a
 * currency, a phone type or a text format.
 *
 * So the user supplies Podio's own documented structure, and `app-fields-list`
 * exists to tell them what to put in it.
 */
export function fieldsParam(required: boolean, extraHint = ""): Param {
  return {
    key: "fields",
    label: "Field values",
    type: "json",
    required,
    placeholder: '{"title": "Acme Ltd", "status": {"value": 1}, "amount": ' +
      '{"value": "500.00", "currency": "USD"}}',
    hint: "A JSON object keyed by each field's external_id (or numeric field_id). The value " +
      "may be a scalar, an object of sub_ids, or an array of either — Podio accepts all " +
      "four forms. Run List App Fields against the app to see every key, its type and its " +
      "sub_ids. Category values are the option ID, not the option text." +
      (extraHint ? ` ${extraHint}` : ""),
  };
}
