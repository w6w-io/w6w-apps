import type { ActionDefinition } from "@w6w/types";
import { YouCanBookMeClient } from "../lib/client.ts";

interface Input {
  accountId: string;
  profileId: string;
  name: string;
  description?: string;
  slotLengthMinutes?: number;
  numberOfSlots?: number;
  price?: number;
  order?: string;
  fields?: string;
}

const DEFAULT_FIELDS = "id,name,description,pic,slotLengthMinutes,numberOfSlots,price";

/**
 * POST /{accountId}/profiles/{profileId}/appointmenttypes/items — add an
 * appointment type (a bookable service) to a booking page. Fields match the
 * `ProfileAppointmentType` schema.
 */
const createAppointmentType: ActionDefinition<Input> = {
  key: "create-appointment-type",
  type: "perform",
  resource: "appointment-type",
  title: "Create Appointment Type",
  description:
    "Add an appointment type to a booking page (POST /profiles/{profileId}/appointmenttypes/items).",
  idempotent: false,
  params: [
    { key: "accountId", label: "Account ID", type: "string", required: true },
    { key: "profileId", label: "Booking page ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    {
      key: "slotLengthMinutes",
      label: "Duration (minutes)",
      type: "number",
      validation: { min: 1, integer: true },
    },
    {
      key: "numberOfSlots",
      label: "Number of slots",
      type: "number",
      advanced: true,
      validation: { min: 1, integer: true },
    },
    { key: "price", label: "Price", type: "number", advanced: true },
    {
      key: "order",
      label: "Display order",
      type: "string",
      advanced: true,
      hint: "Position among the booking page's other appointment types.",
    },
    {
      key: "fields",
      label: "Response fields",
      type: "string",
      advanced: true,
      default: DEFAULT_FIELDS,
    },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = {
      name: input.name,
      description: input.description,
      slotLengthMinutes: input.slotLengthMinutes,
      numberOfSlots: input.numberOfSlots,
      price: input.price,
    };
    return new YouCanBookMeClient(ctx).request(
      `/${input.accountId}/profiles/${input.profileId}/appointmenttypes/items`,
      {
        method: "POST",
        query: { order: input.order, fields: input.fields ?? DEFAULT_FIELDS },
        body,
      },
    );
  },
};

export default createAppointmentType;
