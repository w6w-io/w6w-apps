import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { emailParam, listIdParam } from "../lib/params.ts";

/**
 * `GET /api/v3.3/subscribers/{listid}.json?email={email}` — one subscriber's
 * details. **List-level.**
 *
 * `State` is one of `Active`, `Unconfirmed`, `Unsubscribed`, `Bounced` or
 * `Deleted` — the same five as `list-subscribers-get`, so this endpoint answers
 * for a subscriber in *any* state, not just an active one. `Date` is when they
 * entered the current state; `ListJoinedDate` (new in v3.3) is when they first
 * joined.
 *
 * `ConsentToTrack` is returned only with `includetrackingpreference=true`.
 * `MobileNumber` and `ConsentToSendSms` are returned when a mobile number exists
 * — no flag needed on this endpoint, unlike the paged list ones.
 */
interface Input {
  listId: string;
  email: string;
  includeTrackingPreference?: boolean;
}

interface Subscriber {
  EmailAddress: string;
  Name: string;
  State: string;
  Date: string;
  ListJoinedDate?: string;
  MobileNumber?: string;
  CustomFields: Array<{ Key: string; Value: string }>;
  ReadsEmailWith?: string;
  ConsentToTrack?: string;
  ConsentToSendSms?: string;
}

const subscriberGet: ActionDefinition<Input, Subscriber> = {
  key: "subscriber-get",
  type: "read",
  resource: "subscriber",
  title: "Get Subscriber",
  description:
    "Read one subscriber's name, state, dates, mobile number and custom fields. Answers for any " +
    "state, including unsubscribed and deleted.",
  params: [
    listIdParam,
    emailParam,
    {
      key: "includeTrackingPreference",
      label: "Include tracking consent",
      type: "boolean",
      hint: "Off by default, matching the API. Adds ConsentToTrack to the response.",
    },
  ],
  output: [
    { key: "EmailAddress", type: "string", label: "Email address" },
    { key: "Name", type: "string", label: "Name" },
    {
      key: "State",
      type: "string",
      label: "Active | Unconfirmed | Unsubscribed | Bounced | Deleted",
    },
    { key: "Date", type: "string", label: "When they entered the current state" },
    { key: "ListJoinedDate", type: "string", label: "When they first joined the list" },
    { key: "CustomFields", type: "array", label: "Custom field key/value pairs" },
    { key: "ReadsEmailWith", type: "string", label: "Detected email client" },
  ],

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).json<Subscriber>(
      `/subscribers/${encodeId(input.listId)}`,
      {
        query: {
          email: input.email,
          includetrackingpreference: input.includeTrackingPreference,
        },
      },
    );
  },
};

export default subscriberGet;
