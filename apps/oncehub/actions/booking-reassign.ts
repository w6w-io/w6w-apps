import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  id: string;
  newHost: string;
  locationValue?: string;
}

/**
 * POST /bookings/{id}/reassign — moves a booking to a new host. The new host
 * must belong to the same account, hold an active seat, and not already be
 * the host. When the original meeting was virtual, OnceHub auto-picks the new
 * host's best connected video service unless `location.value` overrides it
 * (only `type: "virtual"` overrides are supported — in-person/phone carry
 * over unchanged, per the vendor's own doc). Requires the Route plan or above.
 */
const bookingReassign: ActionDefinition<Input> = {
  key: "booking-reassign",
  type: "perform",
  resource: "booking",
  title: "Reassign Booking",
  description: "Reassign a booking to a new host (POST /bookings/{id}/reassign).",
  idempotent: false,
  output: [
    { key: "id", type: "string", label: "Booking ID" },
    { key: "status", type: "string", label: "Status" },
  ],
  params: [
    { key: "id", label: "Booking ID", type: "string", required: true },
    {
      key: "newHost",
      label: "New host user ID",
      type: "string",
      required: true,
      hint: "Must hold an active seat license and not already be the current host.",
    },
    {
      key: "locationValue",
      label: "Virtual conferencing override",
      type: "select",
      advanced: true,
      options: [
        { label: "Google Meet", value: "google_meet" },
        { label: "Microsoft Teams", value: "microsoft_teams" },
        { label: "Webex", value: "webex" },
        { label: "GoTo Meeting", value: "gotomeeting" },
        { label: "Zoom", value: "zoom" },
      ],
      hint:
        "Omit to auto-select the new host's best connected service. Only virtual overrides are supported; the service must already be connected for the new host.",
    },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request(`/bookings/${encodeURIComponent(input.id)}/reassign`, {
      method: "POST",
      body: {
        new_host: input.newHost,
        location: input.locationValue ? { type: "virtual", value: input.locationValue } : undefined,
      },
    });
  },
};

export default bookingReassign;
