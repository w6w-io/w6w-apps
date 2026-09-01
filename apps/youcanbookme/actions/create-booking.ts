import type { ActionDefinition } from "@w6w/types";
import { YouCanBookMeClient } from "../lib/client.ts";

interface Input {
  accountId: string;
  profileId: string;
  startsAt: string;
  endsAt: string;
  timeZone?: string;
  title?: string;
  teamMemberId?: string;
  appointmentTypeIds?: unknown;
  answers?: unknown;
  numberOfSlots?: number;
  fields?: string;
}

/**
 * POST /{accountId}/profiles/{profileId}/bookings — create a booking directly
 * on a booking page, bypassing the public booking form (e.g. from a lead
 * captured elsewhere). Body is a partial `Booking`; the fields below are the
 * ones the archived Swagger spec's `Booking` schema documents as plain,
 * settable values (`startsAt`, `endsAt`, `timeZone`, `title`,
 * `teamMemberId`, `appointmentTypeIds`, `numberOfSlots`) plus `answers`
 * (`{ code, string }[]`), matching the vendor's own worked example for
 * reading a booking's answers back.
 */
const createBooking: ActionDefinition<Input> = {
  key: "create-booking",
  type: "perform",
  resource: "booking",
  title: "Create Booking",
  description: "Create a booking on a booking page (POST /profiles/{profileId}/bookings).",
  idempotent: false,
  params: [
    { key: "accountId", label: "Account ID", type: "string", required: true },
    { key: "profileId", label: "Booking page ID", type: "string", required: true },
    { key: "startsAt", label: "Starts at", type: "datetime", required: true },
    { key: "endsAt", label: "Ends at", type: "datetime", required: true },
    {
      key: "timeZone",
      label: "Time zone",
      type: "string",
      hint: "IANA time zone, e.g. Europe/London.",
    },
    { key: "title", label: "Title", type: "string" },
    { key: "teamMemberId", label: "Team member ID", type: "string", advanced: true },
    {
      key: "appointmentTypeIds",
      label: "Appointment type IDs",
      type: "json",
      advanced: true,
      hint: 'JSON array of appointment type ids, e.g. ["at_123"].',
    },
    {
      key: "answers",
      label: "Answers",
      type: "json",
      advanced: true,
      hint: 'JSON array of { "code": <question code>, "string": <answer> } objects.',
    },
    {
      key: "numberOfSlots",
      label: "Number of slots",
      type: "number",
      advanced: true,
      validation: { min: 1, integer: true },
    },
    {
      key: "fields",
      label: "Response fields",
      type: "string",
      advanced: true,
      default: "id",
      hint: "Comma-separated fields to return on the created booking.",
    },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = {
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      timeZone: input.timeZone,
      title: input.title,
      teamMemberId: input.teamMemberId,
      appointmentTypeIds: input.appointmentTypeIds,
      answers: input.answers,
      numberOfSlots: input.numberOfSlots,
    };
    return new YouCanBookMeClient(ctx).request(
      `/${input.accountId}/profiles/${input.profileId}/bookings`,
      { method: "POST", query: { fields: input.fields ?? "id" }, body },
    );
  },
};

export default createBooking;
