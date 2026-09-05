import type { ActionDefinition } from "@w6w/types";
import { apiBaseOf, SimplybookClient } from "../lib/client.ts";

interface Input {
  id: string;
  startDatetime: string;
  serviceId: number;
  providerId: number;
  clientId: number;
  endDatetime?: string;
  locationId?: number;
  categoryId?: number;
  userStatusId?: number;
  additionalFields?: unknown;
}

/**
 * `PUT /admin/bookings/{id}` — modify an existing booking. Accepts the same
 * `AdminBookingBuildEntity` shape as create, so fields left unset here are
 * sent as `undefined` rather than merged server-side with the booking's
 * current values — this app therefore requires the same core fields
 * (`startDatetime`/`serviceId`/`providerId`/`clientId`) on an update as on a
 * create, to avoid silently clearing them.
 */
const bookingUpdate: ActionDefinition<Input> = {
  key: "booking-update",
  type: "perform",
  resource: "booking",
  title: "Update Booking",
  description: "Modify an existing booking (PUT /admin/bookings/{id}).",
  idempotent: true,
  params: [
    { key: "id", label: "Booking ID", type: "string", required: true },
    {
      key: "startDatetime",
      label: "Start date & time",
      type: "datetime",
      required: true,
      hint: "Format YYYY-MM-DD HH:MM:SS, e.g. 2026-09-05 11:15:00.",
    },
    { key: "serviceId", label: "Service ID", type: "number", required: true, row: "who" },
    { key: "providerId", label: "Provider ID", type: "number", required: true, row: "who" },
    { key: "clientId", label: "Client ID", type: "number", required: true, row: "who" },
    { key: "endDatetime", label: "End date & time", type: "datetime", advanced: true },
    { key: "locationId", label: "Location ID", type: "number", advanced: true },
    { key: "categoryId", label: "Category ID", type: "number", advanced: true },
    { key: "userStatusId", label: "User status ID", type: "number", advanced: true },
    {
      key: "additionalFields",
      label: "Intake form fields",
      type: "json",
      advanced: true,
      hint: 'Array of { "id": <fieldId>, "value": <value> } objects.',
    },
  ],

  execute(input, ctx) {
    const client = new SimplybookClient(ctx, apiBaseOf(ctx.connection));
    const body: Record<string, unknown> = {
      start_datetime: input.startDatetime,
      end_datetime: input.endDatetime,
      service_id: input.serviceId,
      provider_id: input.providerId,
      client_id: input.clientId,
      location_id: input.locationId,
      category_id: input.categoryId,
      user_status_id: input.userStatusId,
      additional_fields: input.additionalFields,
    };
    return client.request(`/admin/bookings/${encodeURIComponent(input.id)}`, {
      method: "PUT",
      body,
    });
  },
};

export default bookingUpdate;
