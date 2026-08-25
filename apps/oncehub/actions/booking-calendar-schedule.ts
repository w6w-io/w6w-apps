import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  id: string;
  startTime: string;
  guestTimeZone: string;
  name: string;
  email: string;
  phone?: string;
  customFields?: unknown;
  locationType?: string;
  locationValue?: string;
}

/**
 * POST /booking-calendars/{id}/schedule — books one of the slots returned by
 * `booking-calendar-time-slots-get`; `startTime` must be one of those exact
 * values. `location` is optional (the system auto-picks when omitted,
 * preferring `virtual`); to use a guest-driven type (`in_person_by_guest`,
 * `guest_phone`) the value must be given explicitly. Custom booking-form
 * questions are passed as extra top-level keys on `booking_form` — the key
 * must exactly match the question's mapped field name, so `customFields`
 * here is a flat object merged in verbatim rather than a fixed param list.
 */
const bookingCalendarSchedule: ActionDefinition<Input> = {
  key: "booking-calendar-schedule",
  type: "perform",
  resource: "booking-calendar",
  title: "Book a Time Slot",
  description: "Book a time slot on a booking calendar (POST /booking-calendars/{id}/schedule).",
  idempotent: false,
  output: [
    { key: "id", type: "string", label: "New booking ID" },
  ],
  params: [
    { key: "id", label: "Booking calendar ID", type: "string", required: true },
    {
      key: "startTime",
      label: "Start time",
      type: "datetime",
      required: true,
      hint: "Must be an exact start_time value from the available-time-slots response.",
    },
    {
      key: "guestTimeZone",
      label: "Guest timezone",
      type: "string",
      required: true,
      hint: "IANA timezone, e.g. America/New_York.",
    },
    { key: "name", label: "Guest name", type: "string", required: true, row: "guest" },
    { key: "email", label: "Guest email", type: "string", required: true, row: "guest" },
    { key: "phone", label: "Guest phone", type: "string", advanced: true },
    {
      key: "customFields",
      label: "Custom booking form fields",
      type: "json",
      advanced: true,
      hint: 'Object of { "<mapped_field_name>": <value> }, merged into booking_form.',
    },
    {
      key: "locationType",
      label: "Location type override",
      type: "select",
      advanced: true,
      options: [
        { label: "Physical", value: "physical" },
        { label: "Virtual", value: "virtual" },
        { label: "Virtual (static link)", value: "virtual_static" },
        { label: "Guest phone", value: "guest_phone" },
        { label: "In-person (guest-provided)", value: "in_person_by_guest" },
      ],
      hint:
        "Omit to let OnceHub auto-select from the slot's offered locations, preferring virtual.",
    },
    {
      key: "locationValue",
      label: "Location value",
      type: "string",
      advanced: true,
      hint:
        "physical: address ID. virtual: google_meet/microsoft_teams/gotomeeting/webex/zoom. guest_phone: E.164 number. in_person_by_guest: the address.",
    },
  ],

  execute(input, ctx) {
    const extra = input.customFields && typeof input.customFields === "object"
      ? input.customFields as Record<string, unknown>
      : {};
    const bookingForm: Record<string, unknown> = {
      name: input.name,
      email: input.email,
      phone: input.phone,
      ...extra,
    };
    return new OnceHubClient(ctx).request(
      `/booking-calendars/${encodeURIComponent(input.id)}/schedule`,
      {
        method: "POST",
        body: {
          start_time: input.startTime,
          guest_time_zone: input.guestTimeZone,
          booking_form: bookingForm,
          location: input.locationType
            ? { type: input.locationType, value: input.locationValue ?? null }
            : undefined,
        },
      },
    );
  },
};

export default bookingCalendarSchedule;
