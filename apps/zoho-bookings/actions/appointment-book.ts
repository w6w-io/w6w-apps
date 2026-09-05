import type { ActionDefinition } from "@w6w/types";
import { type BookingsEnvelope, unwrapReturnValue, ZohoBookingsClient } from "../lib/client.ts";
import { appointmentOutput, serviceIdRequired, staffId } from "../lib/params.ts";

interface Input {
  serviceId: string;
  staffId?: string;
  resourceId?: string;
  groupId?: string;
  fromTime: string;
  toTime?: string;
  timezone?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
  additionalFields?: unknown;
  costPaid?: string | number;
}

/**
 * `POST /bookings/v1/json/appointment` — a `multipart/form-data` body (see
 * `lib/client.ts` module docs), several of whose fields are themselves
 * JSON-encoded strings: `customer_details` (name/email/phone_number, exposed
 * here as three friendly params since the shape is fixed and small),
 * `additional_fields` (a genuinely per-account set of custom fields, so it
 * stays a raw JSON param), and `payment_info` (`{"cost_paid": "..."}`,
 * built from the single `costPaid` param).
 *
 * `staff_id`/`resource_id`/`group_id` are documented as one combined
 * requirement ("any one... group_id is mandatory" for a collective booking)
 * — enforced in `execute` rather than left to Zoho's own 400.
 */
const appointmentBook: ActionDefinition<Input> = {
  key: "appointment-book",
  type: "perform",
  resource: "appointment",
  title: "Book Appointment",
  description: "Book an appointment for a customer against a service.",
  idempotent: false,
  params: [
    serviceIdRequired,
    { ...staffId, hint: "Provide this, Resource ID, or (for a collective booking) Group ID." },
    { key: "resourceId", label: "Resource ID", type: "string" },
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      hint: "Required for a collective-booking service.",
    },
    {
      key: "fromTime",
      label: "From time",
      type: "string",
      required: true,
      hint: "Format: dd-MMM-yyyy HH:mm:ss (24-hour), e.g. 30-Apr-2030 22:00:00.",
    },
    {
      key: "toTime",
      label: "To time",
      type: "string",
      hint: "Resource bookings only. Same format as From time.",
    },
    { key: "timezone", label: "Timezone", type: "string", hint: "e.g. Asia/Calcutta." },
    { key: "customerName", label: "Customer name", type: "string", required: true },
    { key: "customerEmail", label: "Customer email", type: "string", required: true },
    { key: "customerPhone", label: "Customer phone", type: "string" },
    { key: "notes", label: "Notes", type: "text" },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      hint: 'Custom-field values configured on this account, e.g. { "Location": "Adelaide" }.',
    },
    { key: "costPaid", label: "Amount paid", type: "string", hint: 'e.g. "100.00".' },
  ],
  output: appointmentOutput,

  async execute(input, ctx) {
    if (!input.staffId && !input.resourceId && !input.groupId) {
      throw new Error("Provide one of `staffId`, `resourceId` or `groupId`.");
    }
    const form = new FormData();
    form.append("service_id", input.serviceId);
    if (input.staffId) form.append("staff_id", input.staffId);
    if (input.resourceId) form.append("resource_id", input.resourceId);
    if (input.groupId) form.append("group_id", input.groupId);
    form.append("from_time", input.fromTime);
    if (input.toTime) form.append("to_time", input.toTime);
    if (input.timezone) form.append("timezone", input.timezone);
    form.append(
      "customer_details",
      JSON.stringify({
        name: input.customerName,
        email: input.customerEmail,
        phone_number: input.customerPhone,
      }),
    );
    if (input.notes) form.append("notes", input.notes);
    if (input.additionalFields !== undefined && input.additionalFields !== null) {
      form.append(
        "additional_fields",
        typeof input.additionalFields === "string"
          ? input.additionalFields
          : JSON.stringify(input.additionalFields),
      );
    }
    if (input.costPaid !== undefined && input.costPaid !== null && input.costPaid !== "") {
      form.append("payment_info", JSON.stringify({ cost_paid: String(input.costPaid) }));
    }

    const body = await new ZohoBookingsClient(ctx).request<BookingsEnvelope>("/appointment", {
      method: "POST",
      form,
    });
    return unwrapReturnValue(body, "POST", "/bookings/v1/json/appointment");
  },
};

export default appointmentBook;
