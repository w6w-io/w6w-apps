import type { ActionDefinition } from "@w6w/types";
import { YouCanBookMeClient } from "../lib/client.ts";

interface Input {
  accountId: string;
  profileId: string;
  bookingId: string;
  displayTimeZone?: string;
  fields?: string;
}

const DEFAULT_FIELDS =
  "id,title,accountId,profileId,createdAt,startsAt,endsAt,location,tentative,timeZone,cancelled,numberOfSlots";

/** GET /{accountId}/profiles/{profileId}/bookings/{bookingId} — read one booking. */
const getBooking: ActionDefinition<Input> = {
  key: "get-booking",
  type: "read",
  resource: "booking",
  title: "Get Booking",
  description: "Retrieve a single booking by id (GET /profiles/{profileId}/bookings/{bookingId}).",
  params: [
    { key: "accountId", label: "Account ID", type: "string", required: true },
    { key: "profileId", label: "Booking page ID", type: "string", required: true },
    { key: "bookingId", label: "Booking ID", type: "string", required: true },
    { key: "displayTimeZone", label: "Display time zone", type: "string", advanced: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      advanced: true,
      default: DEFAULT_FIELDS,
      hint:
        'Comma-separated response fields, dotted for nested objects (e.g. "answers,answers.code,answers.string").',
    },
  ],

  execute(input, ctx) {
    return new YouCanBookMeClient(ctx).request(
      `/${input.accountId}/profiles/${input.profileId}/bookings/${input.bookingId}`,
      {
        query: {
          displayTimeZone: input.displayTimeZone,
          fields: input.fields ?? DEFAULT_FIELDS,
        },
      },
    );
  },
};

export default getBooking;
