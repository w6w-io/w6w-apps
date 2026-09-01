import type { ActionDefinition } from "@w6w/types";
import { YouCanBookMeClient } from "../lib/client.ts";

interface Input {
  accountId: string;
  fields?: string;
}

const DEFAULT_FIELDS =
  "id,accountId,title,description,subdomain,timeZone,status,calendarIds,targetCalendarId";

/** GET /{accountId}/profiles — list booking pages ("profiles") on an account. */
const listProfiles: ActionDefinition<Input, unknown[]> = {
  key: "list-profiles",
  type: "read",
  resource: "profile",
  title: "List Booking Pages",
  description: "List booking pages on an account (GET /profiles).",
  params: [
    { key: "accountId", label: "Account ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      advanced: true,
      default: DEFAULT_FIELDS,
      hint: "Comma-separated response fields.",
    },
  ],
  output: [{ key: "", type: "array", label: "Booking pages" }],

  execute(input, ctx) {
    return new YouCanBookMeClient(ctx).request<unknown[]>(`/${input.accountId}/profiles`, {
      query: { fields: input.fields ?? DEFAULT_FIELDS },
    });
  },
};

export default listProfiles;
