import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the TidyCal actions.
 *
 * Every field, bound and default here is copied from TidyCal's own OpenAPI 3.0
 * document (extracted from the `__redoc_state` blob of
 * `tidycal.com/developer/docs/` on 2026-08-11), not inferred from a sibling app.
 *
 * ## The document mislabels its own query parameters
 *
 * On `GET /bookings` and on the three `page`-taking collection endpoints, the
 * document declares `starts_at`, `ends_at`, `cancelled`, `page` and
 * `include_teams` as `"in": "path"`. They are **query** parameters. Three
 * independent reasons, none of which needs a credential:
 *
 *  1. The path template is the literal string `/bookings` — it contains no
 *     `{starts_at}` placeholder for a path parameter to bind to, so `in: "path"`
 *     is unsatisfiable as written.
 *  2. `/bookings/{booking}` already occupies the one-extra-segment slot on that
 *     resource and binds an `integer` id, so a date could not be routed there.
 *  3. The *same* filters on `GET /teams/{team}/bookings` are declared
 *     `"in": "query"` in the same document.
 *
 * This is the signature of a generator that emits `in: "path"` for anything not
 * explicitly told otherwise; taking it literally produces requests to
 * `/api/bookings/2026-01-01`, which the site answers with a 404 about a missing
 * *User* model (see `lib/client.ts`).
 *
 * ## …and it renames the same filters between two endpoints
 *
 * The personal booking list filters on `starts_at` / `ends_at`. The team booking
 * list filters on `start_date` / `end_date` — different names for the same
 * question, in the same API, four operations apart. Copying either pair to the
 * other endpoint silently returns *unfiltered* results rather than an error,
 * because Laravel ignores query parameters it was not asked about. That is why
 * the two lists have separate param fragments below instead of one shared one.
 */

/**
 * `page` — the only pagination control TidyCal exposes.
 *
 * There is no `per_page`, `limit` or `offset` anywhere in the document, and no
 * documented page size. The response schema declares only `data`, so this app
 * does not claim to know what the pagination envelope looks like; see the
 * envelope note in `lib/client.ts`.
 */
export const pageParam: Param = {
  key: "page",
  label: "Page",
  type: "number",
  validation: { integer: true, min: 1 },
  hint: "1-based page number. TidyCal exposes no page-size control and documents no page size, " +
    "so walk pages until one comes back empty.",
};

/** The personal booking-list date window. See the renaming note above. */
export function bookingWindowParams(): Param[] {
  return [
    {
      key: "starts_at",
      label: "Starts after",
      type: "string",
      placeholder: "2026-01-01",
      hint: "Only bookings starting from this date. TidyCal's schema types this as `date` (not a " +
        "valid OpenAPI type), so the exact accepted format is unverifiable and the value is " +
        "passed through verbatim — an ISO 8601 date is the safe reading. Note this endpoint " +
        "uses `starts_at`/`ends_at` where the team endpoint uses `start_date`/`end_date`.",
    },
    {
      key: "ends_at",
      label: "Ends before",
      type: "string",
      placeholder: "2026-02-01",
      hint: "Only bookings ending before this date. Same format caveat as Starts after.",
    },
  ];
}

/** The team booking-list date window — different names, same question. */
export function teamBookingWindowParams(): Param[] {
  return [
    {
      key: "start_date",
      label: "Start date",
      type: "date",
      hint: "Only bookings starting from this date. The team endpoint spells these " +
        "`start_date`/`end_date`; the personal one spells them `starts_at`/`ends_at`.",
    },
    {
      key: "end_date",
      label: "End date",
      type: "date",
      hint: "Only bookings ending before this date.",
    },
  ];
}

export const bookingIdParam: Param = {
  key: "booking",
  label: "Booking ID",
  type: "number",
  required: true,
  validation: { integer: true },
  hint: "The numeric `id` of a booking, from a List bookings result.",
};

export const bookingTypeIdParam: Param = {
  key: "bookingType",
  label: "Booking type ID",
  type: "number",
  required: true,
  validation: { integer: true },
  hint: "The numeric `id` of a booking type, from a List booking types result. TidyCal publishes " +
    "no single-booking-type read, so the list is the only place to get it.",
};

export const teamIdParam: Param = {
  key: "team",
  label: "Team ID",
  type: "number",
  required: true,
  validation: { integer: true },
  hint: "The numeric `id` of a team, from a List teams result.",
};

/**
 * The booking-type creation body, shared verbatim by the personal and the team
 * create endpoints — the document declares byte-identical request schemas for
 * `POST /booking-types` and `POST /teams/{team}/booking-types`.
 */
export function bookingTypeBodyParams(): Param[] {
  return [
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      validation: { maxLength: 191 },
      placeholder: "30 Minute Meeting",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      required: true,
      hint: "TidyCal declares this `format: html`, so markup is accepted. It is required — a " +
        "booking type cannot be created without one.",
    },
    {
      key: "duration_minutes",
      label: "Duration (minutes)",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "url_slug",
      label: "URL slug",
      type: "string",
      required: true,
      validation: { maxLength: 191 },
      placeholder: "30-minute-meeting",
      hint:
        "The path segment of the public booking page, e.g. tidycal.com/<you>/30-minute-meeting.",
    },
    {
      key: "padding_minutes",
      label: "Padding (minutes)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Buffer after each booking. Defaults to 0.",
    },
    {
      key: "latest_availability_days",
      label: "Bookable how far ahead (days)",
      type: "number",
      validation: { integer: true, min: 0, max: 36500 },
      hint: "Defaults to 60.",
    },
    {
      key: "booking_threshold",
      label: "Minimum notice (minutes)",
      type: "number",
      validation: { integer: true, min: 0, max: 15000 },
      hint: "Omit for TidyCal's default of 120 (2 hours); set 0 for no minimum notice. Note the " +
        "asymmetry: the field is `booking_threshold` on the way in and " +
        "`booking_threshold_minutes` on the way out.",
    },
    {
      key: "booking_availability_interval_minutes",
      label: "Slot interval (minutes)",
      type: "number",
      validation: { integer: true, min: 15, max: 1440 },
      hint: "How far apart offered start times are. Defaults to 15.",
    },
    {
      key: "max_bookings",
      label: "Max bookings per slot",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Above 1 this becomes a group booking type. Defaults to 1.",
    },
    {
      key: "max_guest_invites_per_booker",
      label: "Max guest invites per booker",
      type: "number",
      validation: { integer: true, min: 0, max: 10 },
      hint: "Defaults to 0.",
    },
    {
      key: "display_seats_remaining",
      label: "Show seats remaining",
      type: "boolean",
      hint: "Group booking types only. Defaults to off.",
    },
    {
      key: "private",
      label: "Private",
      type: "boolean",
      hint: "A private booking type is reachable by direct link but not listed publicly.",
    },
    {
      key: "approval_required",
      label: "Require approval",
      type: "boolean",
    },
    {
      key: "redirect_url",
      label: "Redirect URL",
      type: "string",
      validation: { maxLength: 60000 },
      placeholder: "https://example.com/thank-you",
      hint: "Where the booker lands after booking.",
    },
    {
      key: "booking_type_category_id",
      label: "Category ID",
      type: "number",
      validation: { integer: true },
      hint: "TidyCal publishes no endpoint that lists categories, so this is a raw numeric id.",
    },
    {
      key: "price",
      label: "Price",
      type: "number",
      validation: { min: 0 },
      hint: "0 (the default) makes the booking type free.",
    },
    {
      key: "payment_platform",
      label: "Payment platform",
      type: "select",
      options: [
        { value: "stripe", label: "Stripe" },
        { value: "paypal", label: "PayPal" },
        { value: "tidycal", label: "TidyCal" },
      ],
      hint: "Required when Price is above 0, and the platform must already be connected under " +
        "Integrations in your TidyCal account.",
    },
    {
      key: "currency_code",
      label: "Currency",
      type: "string",
      placeholder: "USD",
      hint: "ISO 4217. Defaults to your account currency.",
    },
  ];
}

/** The keys of {@link bookingTypeBodyParams}, in declaration order. */
export const BOOKING_TYPE_BODY_KEYS = [
  "title",
  "description",
  "duration_minutes",
  "url_slug",
  "padding_minutes",
  "latest_availability_days",
  "booking_threshold",
  "booking_availability_interval_minutes",
  "max_bookings",
  "max_guest_invites_per_booker",
  "display_seats_remaining",
  "private",
  "approval_required",
  "redirect_url",
  "booking_type_category_id",
  "price",
  "payment_platform",
  "currency_code",
] as const;

export type BookingTypeBodyInput = Partial<
  Record<typeof BOOKING_TYPE_BODY_KEYS[number], string | number | boolean>
>;

/**
 * Project a booking-type input onto the documented body, dropping anything the
 * user left blank.
 *
 * Explicit rather than a spread of `input`: an action's input object may carry
 * host-added keys, and posting an undocumented field to a Laravel validator is
 * how a create turns into a 422 nobody can explain.
 */
export function bookingTypeBody(input: BookingTypeBodyInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of BOOKING_TYPE_BODY_KEYS) {
    const value = input[key];
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }
  return out;
}
