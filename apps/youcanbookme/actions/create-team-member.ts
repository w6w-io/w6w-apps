import type { ActionDefinition } from "@w6w/types";
import { YouCanBookMeClient } from "../lib/client.ts";

interface Input {
  accountId: string;
  profileId: string;
  name: string;
  email?: string;
  description?: string;
  calendarId?: string;
  order?: string;
  fields?: string;
}

const DEFAULT_FIELDS =
  "id,name,description,pic,calendarId,targetCalendarTitle,targetCalendatTimeZone";

/**
 * POST /{accountId}/profiles/{profileId}/teammembers/items — add a team
 * member to a booking page, so bookings can be assigned/round-robined across
 * a team's calendars. Fields match the `ProfileTeamMember` schema.
 */
const createTeamMember: ActionDefinition<Input> = {
  key: "create-team-member",
  type: "perform",
  resource: "team-member",
  title: "Create Team Member",
  description:
    "Add a team member to a booking page (POST /profiles/{profileId}/teammembers/items).",
  idempotent: false,
  params: [
    { key: "accountId", label: "Account ID", type: "string", required: true },
    { key: "profileId", label: "Booking page ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "email", label: "Email", type: "string" },
    { key: "description", label: "Description", type: "text", advanced: true },
    {
      key: "calendarId",
      label: "Calendar ID",
      type: "string",
      advanced: true,
      hint: "The team member's remote calendar id to book against.",
    },
    {
      key: "order",
      label: "Display order",
      type: "string",
      advanced: true,
      hint: "Position among the booking page's other team members.",
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
      email: input.email,
      description: input.description,
      calendarId: input.calendarId,
    };
    return new YouCanBookMeClient(ctx).request(
      `/${input.accountId}/profiles/${input.profileId}/teammembers/items`,
      {
        method: "POST",
        query: { order: input.order, fields: input.fields ?? DEFAULT_FIELDS },
        body,
      },
    );
  },
};

export default createTeamMember;
