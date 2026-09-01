import type { ActionDefinition, Param } from "@w6w/types";
import { compact, LumaClient } from "../lib/client.ts";
import { eventIdParam, ISO_DATETIME_HINT } from "../lib/params.ts";

interface Input {
  eventId: string;
  suppressNotifications?: boolean;
  name?: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
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
}

/**
 * `POST /v1/events/update`.
 *
 * Every field but `event_id` is optional and only sent when set — an update
 * changes only what the caller names. Field shapes and the `theme`/`font`
 * free-text choice mirror `event-create.ts`; `ticket_types` has no update
 * counterpart in this body (use the dedicated ticket-type Actions instead).
 */
const jsonParam = (key: string, label: string, hint: string): Param => ({
  key,
  label,
  type: "json",
  advanced: true,
  hint,
});
const themeHint = "One of: standard, cross, diamond, falling-leaves, fireworks, floral, " +
  "grain-dark, grain-light, grid, bats, holiday-diwali, holiday-foliage, holiday-hanukkah, " +
  "holiday-pie, holiday-santa, holiday-sweater, holiday-turkey, hypnotic, life, matrix, " +
  "particles-bokeh, particles-champagne, plus, iridescent-dark, iridescent-light, polkadot, " +
  "pool-dark, pool-light, snake, snow-dark, snow-light, space-war, sunny-shades, tamagotchi, " +
  "warp, wave, zigzag. Retired themes fall back to `standard`.";
const fontHint = "One of: alternate, alverata, avant-garde, beaufort, blithe, caslon, degular, " +
  "departure, factoria, futura, garamond, geist-mono, google, ivy-mode, ivy-presto, museo, " +
  "neuzeit, new-spirit, poster, roc-grotesk, snpro, strenuous, pearl. Pass empty to clear.";

const eventUpdate: ActionDefinition<Input> = {
  key: "event-update",
  type: "perform",
  resource: "event",
  title: "Update Event",
  description: "Update one or more fields of an existing event.",
  idempotent: true,
  params: [
    eventIdParam,
    {
      key: "suppressNotifications",
      label: "Suppress notifications",
      type: "boolean",
      hint: "If true, guests are not notified when the name, time or location changes.",
    },
    { key: "name", label: "Name", type: "string" },
    { key: "startAt", label: "Start at", type: "datetime", hint: ISO_DATETIME_HINT },
    { key: "endAt", label: "End at", type: "datetime", hint: ISO_DATETIME_HINT },
    { key: "timezone", label: "Timezone", type: "string", placeholder: "America/New_York" },
    { key: "descriptionMd", label: "Description (Markdown)", type: "text" },
    { key: "coverUrl", label: "Cover image URL", type: "string" },
    { key: "meetingUrl", label: "Meeting URL", type: "string" },
    { key: "slug", label: "Slug", type: "string", validation: { minLength: 3, maxLength: 50 } },
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
    { key: "tintColor", label: "Accent color", type: "string", advanced: true },
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
    { key: "registrationOpen", label: "Registration open", type: "boolean" },
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
        { value: "guests-only", label: "Guests only" },
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
      "Array of RegistrationQuestion objects — see docs.luma.com's Events > Update Event " +
        "reference for the full per-question-type shape.",
    ),
    jsonParam(
      "feedbackEmail",
      "Feedback email settings",
      '{"enabled": true, "delay": "PT0M"}.',
    ),
  ],
  output: [],

  async execute(input, ctx) {
    const coordinate = input.latitude !== undefined && input.longitude !== undefined
      ? { latitude: input.latitude, longitude: input.longitude }
      : undefined;

    await new LumaClient(ctx).json("/v1/events/update", {
      method: "POST",
      body: compact({
        event_id: input.eventId,
        suppress_notifications: input.suppressNotifications,
        name: input.name,
        start_at: input.startAt,
        end_at: input.endAt,
        timezone: input.timezone,
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
      }),
    });
    return { ok: true };
  },
};

export default eventUpdate;
