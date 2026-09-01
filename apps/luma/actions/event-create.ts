import type { ActionDefinition, Param } from "@w6w/types";
import { compact, LumaClient } from "../lib/client.ts";
import { ISO_DATETIME_HINT } from "../lib/params.ts";

interface Input {
  name: string;
  startAt: string;
  timezone: string;
  endAt?: string;
  descriptionMd?: string;
  coverUrl?: string;
  meetingUrl?: string;
  slug?: string;
  visibility?: "public" | "members-only" | "private";
  theme?: string;
  font?: string;
  tintColor?: string;
  maxCapacity?: number;
  canRegisterForMultipleTickets?: boolean;
  registrationOpen?: boolean;
  showGuestList?: boolean;
  remindersDisabled?: boolean;
  waitlistStatus?: "disabled" | "enabled";
  locationVisibility?: "public" | "guests-only";
  nameRequirement?: "full-name" | "first-last";
  phoneNumberRequirement?: "optional" | "required";
  latitude?: number;
  longitude?: number;
  geoAddressJson?: unknown;
  registrationQuestions?: unknown;
  feedbackEmail?: unknown;
  ticketTypes?: unknown;
}

/**
 * `POST /v1/events/create`.
 *
 * Luma's `EventCreateRequest` schema has ~30 optional fields (fonts, themes,
 * feedback-email timing, per-question registration forms, ticket type
 * arrays). The common, everyday ones are exposed as typed params here;
 * `registrationQuestions`, `feedbackEmail` and `ticketTypes` — each a
 * variable-shaped nested structure the vendor itself documents as an object
 * schema rather than a flat form — are exposed as raw `json` params instead
 * of a hand-built sub-form, the same pattern this pack uses for Apify's
 * Actor input. `geoAddressJson` is `json` for the same reason: it is a
 * vendor `oneOf` (`{type:"manual", address}` or `{type:"google", place_id}`)
 * with no single flat shape.
 *
 * `theme` and `font` are free-text `string` params rather than `select`
 * lists: Luma documents 36 themes and 23 fonts, both explicitly subject to
 * retirement over time ("Themes may be retired... falls back to `standard`"),
 * so a hard-coded option list would silently go stale. The full current
 * lists are in the hint text, copied verbatim from the OpenAPI enum.
 */
const themeHint = "One of: standard, cross, diamond, falling-leaves, fireworks, floral, " +
  "grain-dark, grain-light, grid, bats, holiday-diwali, holiday-foliage, holiday-hanukkah, " +
  "holiday-pie, holiday-santa, holiday-sweater, holiday-turkey, hypnotic, life, matrix, " +
  "particles-bokeh, particles-champagne, plus, iridescent-dark, iridescent-light, polkadot, " +
  "pool-dark, pool-light, snake, snow-dark, snow-light, space-war, sunny-shades, tamagotchi, " +
  "warp, wave, zigzag. Retired themes fall back to `standard`.";
const fontHint = "One of: alternate, alverata, avant-garde, beaufort, blithe, caslon, degular, " +
  "departure, factoria, futura, garamond, geist-mono, google, ivy-mode, ivy-presto, museo, " +
  "neuzeit, new-spirit, poster, roc-grotesk, snpro, strenuous, pearl. Leave empty to use the " +
  "theme's default (or the standard font with no theme).";

const jsonParam = (key: string, label: string, hint: string): Param => ({
  key,
  label,
  type: "json",
  advanced: true,
  hint,
});

const eventCreate: ActionDefinition<Input> = {
  key: "event-create",
  type: "perform",
  resource: "event",
  title: "Create Event",
  description: "Create a new event on the connected calendar.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "startAt",
      label: "Start at",
      type: "datetime",
      required: true,
      hint: ISO_DATETIME_HINT,
    },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      required: true,
      placeholder: "America/New_York",
      hint: "IANA timezone name.",
    },
    { key: "endAt", label: "End at", type: "datetime", hint: ISO_DATETIME_HINT },
    {
      key: "descriptionMd",
      label: "Description (Markdown)",
      type: "text",
      hint: "Converted to Luma's rich-text format. Images must be hosted on images.lumacdn.com " +
        "(upload via the Create Upload URL action first).",
    },
    {
      key: "coverUrl",
      label: "Cover image URL",
      type: "string",
      hint: "Must already be uploaded to images.lumacdn.com.",
    },
    { key: "meetingUrl", label: "Meeting URL", type: "string" },
    {
      key: "slug",
      label: "Slug",
      type: "string",
      validation: { minLength: 3, maxLength: 50 },
      hint: "Event URL becomes luma.com/<slug>. Fails if already taken.",
    },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      options: [
        { value: "public", label: "Public" },
        { value: "members-only", label: "Members only" },
        { value: "private", label: "Private" },
      ],
    },
    { key: "theme", label: "Theme", type: "string", advanced: true, hint: themeHint },
    { key: "font", label: "Font", type: "string", advanced: true, hint: fontHint },
    {
      key: "tintColor",
      label: "Accent color",
      type: "string",
      placeholder: "#bb2dc7",
      advanced: true,
    },
    {
      key: "maxCapacity",
      label: "Max capacity",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    {
      key: "canRegisterForMultipleTickets",
      label: "Allow multiple tickets per registration",
      type: "boolean",
      advanced: true,
    },
    { key: "registrationOpen", label: "Registration open", type: "boolean", default: true },
    { key: "showGuestList", label: "Show guest list", type: "boolean", advanced: true },
    { key: "remindersDisabled", label: "Disable reminder emails", type: "boolean", advanced: true },
    {
      key: "waitlistStatus",
      label: "Waitlist",
      type: "select",
      advanced: true,
      options: [
        { value: "disabled", label: "Disabled" },
        { value: "enabled", label: "Enabled" },
      ],
    },
    {
      key: "locationVisibility",
      label: "Location visibility",
      type: "select",
      advanced: true,
      options: [
        { value: "public", label: "Public" },
        { value: "guests-only", label: "Guests only (approved guests see the exact address)" },
      ],
    },
    {
      key: "nameRequirement",
      label: "Name requirement",
      type: "select",
      advanced: true,
      options: [
        { value: "full-name", label: "Full name, one field" },
        { value: "first-last", label: "First + last name, two fields" },
      ],
    },
    {
      key: "phoneNumberRequirement",
      label: "Phone number requirement",
      type: "select",
      advanced: true,
      options: [
        { value: "optional", label: "Optional" },
        { value: "required", label: "Required" },
      ],
    },
    { key: "latitude", label: "Latitude", type: "number", advanced: true },
    { key: "longitude", label: "Longitude", type: "number", advanced: true },
    jsonParam(
      "geoAddressJson",
      "Address",
      'Either {"type":"manual","address":"..."} or {"type":"google","place_id":"..."}.',
    ),
    jsonParam(
      "registrationQuestions",
      "Registration questions",
      "Array of RegistrationQuestion objects — see docs.luma.com's Events > Create Event " +
        "reference for the full per-question-type shape.",
    ),
    jsonParam(
      "feedbackEmail",
      "Feedback email settings",
      '{"enabled": true, "delay": "PT0M"}. `delay` is an ISO 8601 duration, max P30D; negative ' +
        "sends before the event ends.",
    ),
    jsonParam(
      "ticketTypes",
      "Ticket types",
      "Array of TicketTypeCreateInput objects. Replaces the default single free ticket when " +
        "provided. Paid types require a calendar with a connected Stripe account.",
    ),
  ],
  output: [{ key: "id", type: "string", label: "Event ID" }],

  execute(input, ctx) {
    const coordinate = input.latitude !== undefined && input.longitude !== undefined
      ? { latitude: input.latitude, longitude: input.longitude }
      : undefined;

    return new LumaClient(ctx).json("/v1/events/create", {
      method: "POST",
      body: compact({
        name: input.name,
        start_at: input.startAt,
        timezone: input.timezone,
        end_at: input.endAt,
        description_md: input.descriptionMd,
        cover_url: input.coverUrl,
        meeting_url: input.meetingUrl,
        slug: input.slug,
        visibility: input.visibility,
        theme: input.theme,
        font: input.font,
        tint_color: input.tintColor,
        max_capacity: input.maxCapacity,
        can_register_for_multiple_tickets: input.canRegisterForMultipleTickets,
        registration_open: input.registrationOpen,
        show_guest_list: input.showGuestList,
        reminders_disabled: input.remindersDisabled,
        waitlist_status: input.waitlistStatus,
        location_visibility: input.locationVisibility,
        name_requirement: input.nameRequirement,
        phone_number_requirement: input.phoneNumberRequirement,
        coordinate,
        geo_address_json: input.geoAddressJson,
        registration_questions: input.registrationQuestions,
        feedback_email: input.feedbackEmail,
        ticket_types: input.ticketTypes,
      }),
    });
  },
};

export default eventCreate;
