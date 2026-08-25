import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  id: string;
  hideUrlParams?: boolean;
  bookingForm?: unknown;
  utmParams?: unknown;
  bookingSettings?: unknown;
}

/**
 * POST /booking-calendars/{id}/one-time-links — a single-use booking link,
 * only for published calendars. Unconsumed links are auto-deleted after 90
 * days. `bookingSettings.host`/`co_hosts` take email addresses (not user
 * IDs, unlike most of this API), and only apply to team booking calendars.
 */
const bookingCalendarOneTimeLinkCreate: ActionDefinition<Input> = {
  key: "booking-calendar-one-time-link-create",
  type: "perform",
  resource: "booking-calendar",
  title: "Create One-Time Link",
  description:
    "Create a single-use booking link for a booking calendar (POST /booking-calendars/{id}/one-time-links).",
  idempotent: false,
  output: [
    { key: "id", type: "string", label: "One-time link ID" },
    { key: "url", type: "string", label: "One-time link URL" },
    { key: "creation_time", type: "string", label: "Creation time" },
  ],
  params: [
    { key: "id", label: "Booking calendar ID", type: "string", required: true },
    {
      key: "hideUrlParams",
      label: "Hide URL params",
      type: "boolean",
      default: true,
      hint: "Generate a short link with no visible query parameters.",
    },
    {
      key: "bookingForm",
      label: "Pre-filled booking form",
      type: "json",
      advanced: true,
      hint: '{ "name"?, "email"?, "phone"?, ...custom mapped field names }',
    },
    {
      key: "utmParams",
      label: "UTM params",
      type: "json",
      advanced: true,
      hint: '{ "source"?, "medium"?, "campaign"?, "term"?, "content"? }',
    },
    {
      key: "bookingSettings",
      label: "Booking settings",
      type: "json",
      advanced: true,
      hint:
        '{ "host"?: email, "co_hosts"?: "a@x.com,b@x.com", "duration_minutes"?, "skip"?: string[] } — host/co_hosts only apply to team calendars.',
    },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request(
      `/booking-calendars/${encodeURIComponent(input.id)}/one-time-links`,
      {
        method: "POST",
        body: {
          hide_url_params: input.hideUrlParams,
          booking_form: input.bookingForm,
          utm_params: input.utmParams,
          booking_settings: input.bookingSettings,
        },
      },
    );
  },
};

export default bookingCalendarOneTimeLinkCreate;
