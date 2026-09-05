import type { ActionDefinition } from "@w6w/types";
import { apiBaseOf, SimplybookClient } from "../lib/client.ts";

interface Input {
  startDatetime: string;
  serviceId: number;
  providerId: number;
  clientId: number;
  endDatetime?: string;
  locationId?: number;
  categoryId?: number;
  count?: number;
  batchId?: number;
  isSequential?: boolean;
  skipMembership?: boolean;
  acceptPayment?: boolean;
  paymentProcessor?: string;
  userStatusId?: number;
  additionalFields?: unknown;
  recurringSettings?: unknown;
}

/**
 * `POST /admin/bookings` — book a new appointment. Returns a
 * `BookingResultEntity` (`{ bookings: BookingEntity[], batch }`) rather than a
 * single booking: a group/recurring booking (`count` or `recurringSettings`)
 * creates several `BookingEntity` rows in one call, sharing a `batch`.
 *
 * `endDatetime` is accepted by the API but SimplyBook.me derives duration
 * from the service unless overridden — most callers should leave it unset.
 */
const bookingCreate: ActionDefinition<Input> = {
  key: "booking-create",
  type: "perform",
  resource: "booking",
  title: "Create Booking",
  description: "Book a new appointment (POST /admin/bookings).",
  idempotent: false,
  params: [
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
    {
      key: "endDatetime",
      label: "End date & time",
      type: "datetime",
      advanced: true,
      hint: "Omit to let SimplyBook.me derive it from the service's duration.",
    },
    { key: "locationId", label: "Location ID", type: "number", advanced: true },
    { key: "categoryId", label: "Category ID", type: "number", advanced: true },
    {
      key: "count",
      label: "Group booking count",
      type: "number",
      advanced: true,
      hint: "Use either this or Recurring settings, not both.",
    },
    { key: "batchId", label: "Batch ID", type: "number", advanced: true },
    {
      key: "isSequential",
      label: "Sequential (consecutive-services) booking",
      type: "boolean",
      advanced: true,
    },
    {
      key: "skipMembership",
      label: "Skip membership",
      type: "boolean",
      advanced: true,
      hint: "Do not draw this booking from the client's membership, even if eligible.",
    },
    { key: "acceptPayment", label: "Create a payment order", type: "boolean", advanced: true },
    {
      key: "paymentProcessor",
      label: "Payment processor",
      type: "string",
      advanced: true,
      hint: "Only used when Create a payment order is set.",
    },
    { key: "userStatusId", label: "User status ID", type: "number", advanced: true },
    {
      key: "additionalFields",
      label: "Intake form fields",
      type: "json",
      advanced: true,
      hint: 'Array of { "id": <fieldId>, "value": <value> } objects.',
    },
    {
      key: "recurringSettings",
      label: "Recurring settings",
      type: "json",
      advanced: true,
      hint: 'e.g. { "type": "fixed", "days": 7, "repeat_count": 4, "mode": "skip" }. Use ' +
        "either this or Group booking count, not both.",
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
      count: input.count,
      batch_id: input.batchId,
      is_sequential: input.isSequential,
      skip_membership: input.skipMembership,
      accept_payment: input.acceptPayment,
      payment_processor: input.paymentProcessor,
      user_status_id: input.userStatusId,
      additional_fields: input.additionalFields,
      recurring_settings: input.recurringSettings,
    };
    return client.request("/admin/bookings", { method: "POST", body });
  },
};

export default bookingCreate;
