import type { ActionDefinition } from "@w6w/types";
import { YouCanBookMeClient } from "../lib/client.ts";

interface Input {
  accountId: string;
  profileId: string;
  fields?: string;
}

const DEFAULT_FIELDS =
  "id,accountId,title,description,subdomain,timeZone,status,calendarIds,targetCalendarId";

/** GET /{accountId}/profiles/{profileId} — read one booking page ("profile") by id. */
const getProfile: ActionDefinition<Input> = {
  key: "get-profile",
  type: "read",
  resource: "profile",
  title: "Get Booking Page",
  description: "Retrieve a single booking page by id (GET /profiles/{profileId}).",
  params: [
    { key: "accountId", label: "Account ID", type: "string", required: true },
    { key: "profileId", label: "Booking page ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      advanced: true,
      default: DEFAULT_FIELDS,
      hint: "Comma-separated response fields.",
    },
  ],

  execute(input, ctx) {
    return new YouCanBookMeClient(ctx).request(`/${input.accountId}/profiles/${input.profileId}`, {
      query: { fields: input.fields ?? DEFAULT_FIELDS },
    });
  },
};

export default getProfile;
