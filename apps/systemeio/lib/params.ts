import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the systeme.io actions.
 *
 * Every enum and constraint here is copied from the vendor's own OpenAPI 3.1
 * document (`document.api.schema` embedded in the Readme.io reference page,
 * fetched 2026-08-24), not inferred from the rendered HTML or guessed from a
 * similar vendor.
 */

/**
 * The cursor-pagination params every collection endpoint in this app accepts.
 *
 * **`limit`'s floor is 10, not 1** — the OpenAPI schema states `minimum: 10,
 * maximum: 100`. Systeme.io's own pagination guide: set `startingAfter` to the
 * **positive `id` of the last item returned**, never to `0` and never guessed,
 * and keep the same `order` across pages.
 */
export function paginationParams(defaultLimit = 10): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { integer: true, min: 10, max: 100 },
      hint: "10-100. The API's own floor is 10 — a lower value is rejected, not clamped.",
    },
    {
      key: "startingAfter",
      label: "Starting after",
      type: "number",
      hint: "Cursor: the positive id of the last item from the previous page. Omit for the first " +
        "page. Never use 0 or guess a value.",
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending (default)" },
      ],
      hint: "Defaults to descending when omitted.",
    },
  ];
}

/** `query` — the free-text search param shared by several collection endpoints. */
export const queryParam: Param = {
  key: "query",
  label: "Search",
  type: "string",
  hint: "Free-text search query.",
};

/**
 * `Contact.locale` — 28 codes, copied verbatim from the schema's `enum`. Not
 * every value maps to what its 2-letter code suggests: `jp` (Japanese), `ua`
 * (Ukrainian), `dk` (Danish) and `sq` (Albanian) are not the ISO 639-1 codes a
 * caller would guess.
 */
export const localeOptions = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "de", label: "German" },
  { value: "nl", label: "Dutch" },
  { value: "ru", label: "Russian" },
  { value: "jp", label: "Japanese" },
  { value: "tr", label: "Turkish" },
  { value: "ar", label: "Arabic" },
  { value: "zh", label: "Chinese" },
  { value: "sv", label: "Swedish" },
  { value: "ro", label: "Romanian" },
  { value: "cs", label: "Czech" },
  { value: "hu", label: "Hungarian" },
  { value: "sk", label: "Slovak" },
  { value: "dk", label: "Danish" },
  { value: "id", label: "Indonesian" },
  { value: "pl", label: "Polish" },
  { value: "el", label: "Greek" },
  { value: "sr", label: "Serbian" },
  { value: "hi", label: "Hindi" },
  { value: "no", label: "Norwegian" },
  { value: "th", label: "Thai" },
  { value: "sq", label: "Albanian" },
  { value: "sl", label: "Slovenian" },
  { value: "ua", label: "Ukrainian" },
];

/**
 * `Contact.fields` — custom field slug/value pairs, shared by contact create
 * and update. The vendor's own PATCH example sets a field's `value` to `null`
 * to clear it, so `value` is deliberately not `required` here.
 */
export const contactFieldsParam: Param = {
  key: "fields",
  label: "Custom fields",
  type: "array",
  item: {
    type: "object",
    fields: [
      { key: "slug", label: "Field slug", type: "string", required: true },
      {
        key: "value",
        label: "Value",
        type: "string",
        hint: "Leave empty / set null to clear a previously set value. The country field expects " +
          "a 2-letter ISO 3166-1 code.",
      },
    ],
  },
  hint: "Custom contact field values, by slug. Slugs come from the Get Contact Fields action.",
};

/**
 * `Enrollment.accessType` — copied from the schema's `enum`. `modules` (a list
 * of module ids) is required by the vendor ONLY when this is `partial_access`
 * or `partial_dripping_access`, which is why it stays a separate optional
 * param rather than a `showIf`-gated one: the API enforces the pairing
 * server-side, and duplicating that as client-side validation risks going
 * stale the day the vendor adds a fifth access type.
 */
export const enrollmentAccessTypeOptions = [
  { value: "full_access", label: "Full access" },
  { value: "partial_access", label: "Partial access (requires Modules)" },
  { value: "dripping_content", label: "Dripping content" },
  { value: "partial_dripping_access", label: "Partial dripping access (requires Modules)" },
];

/**
 * `Webhook.subscriptions[].event` — the six events the schema documents.
 *
 * The schema offers TWO shapes for each list entry: a bare string (marked
 * `deprecated: true` in the OpenAPI document) and `{event, schemaVersion}`.
 * This app only ever emits the object form — see `schemaVersionParam` below —
 * so a workflow built today does not inherit a deprecation warning on day one.
 */
export const webhookEventOptions = [
  { value: "CONTACT_CREATED", label: "Contact created" },
  { value: "CONTACT_TAG_ADDED", label: "Tag added to contact" },
  { value: "CONTACT_TAG_REMOVED", label: "Tag removed from contact" },
  { value: "CONTACT_OPT_IN", label: "Contact opted in" },
  { value: "SALE_NEW", label: "New sale" },
  { value: "SALE_CANCELED", label: "Sale canceled" },
];

/**
 * `Webhook.subscriptions` — an array of `{event, schemaVersion}` pairs.
 *
 * `schemaVersion` defaults to `2` — the value the vendor's own OpenAPI example
 * uses for every event (`"example": 2`) and the only version documented at
 * all, so it is prefilled rather than left for a caller to guess.
 */
export const webhookSubscriptionsParam: Param = {
  key: "subscriptions",
  label: "Subscribed events",
  type: "array",
  required: true,
  item: {
    type: "object",
    fields: [
      {
        key: "event",
        label: "Event",
        type: "select",
        required: true,
        options: webhookEventOptions,
      },
      {
        key: "schemaVersion",
        label: "Schema version",
        type: "number",
        default: 2,
        validation: { integer: true, min: 1 },
      },
    ],
  },
  hint: "At least one event this webhook fires for.",
};
