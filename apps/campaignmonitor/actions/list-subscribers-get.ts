import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId, type PagedResult } from "../lib/client.ts";
import { listIdParam, orderDirectionParam, pagedOutput, pageParams } from "../lib/params.ts";

/**
 * The five subscriber-state lists, behind one action. **List-level.**
 *
 *     GET /api/v3.3/lists/{listid}/active.json
 *                                  /unconfirmed.json
 *                                  /unsubscribed.json
 *                                  /bounced.json
 *                                  /deleted.json
 *
 * They are one action rather than five because the vendor gives them a
 * byte-identical signature — same `date`, `page`, `pagesize`, `orderfield`,
 * `orderdirection`, `includetrackingpreference` and `includesmspreference`
 * parameters, same `PagedResult` envelope, same record shape — and the v3.3
 * change list applies the same three additions (`ListJoinedDate`,
 * `MobileNumber`, `ConsentToSendSms`) to all five at once. Splitting them would
 * be five copies of one thing that always changes together.
 *
 * ## `date` filters by *state change*, not by join date
 *
 * "Subscribers which became active after the date value specified will be
 * returned" — so on `/bounced` it means "bounced since", on `/unsubscribed`
 * "unsubscribed since". `Date` in each record is that state-change timestamp;
 * `ListJoinedDate` (new in v3.3) is when they first joined, and the two differ
 * for anyone who has ever changed state.
 *
 * ## Two opt-in fields
 *
 * `ConsentToTrack` is returned only with `includetrackingpreference=true`, and
 * `ConsentToSendSms` only with `includesmspreference=true` **and** only when the
 * subscriber has a mobile number. Both default to false, so a workflow that
 * needs consent must ask for it.
 */
interface Input {
  listId: string;
  state?: string;
  date?: string;
  page?: number;
  pageSize?: number;
  orderField?: string;
  orderDirection?: string;
  includeTrackingPreference?: boolean;
  includeSmsPreference?: boolean;
}

interface SubscriberRecord {
  EmailAddress: string;
  Name: string;
  Date: string;
  ListJoinedDate?: string;
  State: string;
  MobileNumber?: string;
  CustomFields: Array<{ Key: string; Value: string }>;
  ReadsEmailWith?: string;
  ConsentToTrack?: string;
  ConsentToSendSms?: string;
}

/** The five documented state paths. Anything else is rejected before a request. */
export const SUBSCRIBER_STATES = [
  "active",
  "unconfirmed",
  "unsubscribed",
  "bounced",
  "deleted",
] as const;

const listSubscribersGet: ActionDefinition<Input, PagedResult<SubscriberRecord>> = {
  key: "list-subscribers-get",
  type: "search",
  resource: "subscriber",
  title: "Get List Subscribers",
  description:
    "Read a page of a list's subscribers in one state (active, unconfirmed, unsubscribed, " +
    "bounced or deleted), optionally filtered to those that entered that state since a date.",
  params: [
    listIdParam,
    {
      key: "state",
      label: "State",
      type: "select",
      required: true,
      default: "active",
      options: [
        { value: "active", label: "Active" },
        { value: "unconfirmed", label: "Unconfirmed (double opt-in, not yet verified)" },
        { value: "unsubscribed", label: "Unsubscribed" },
        { value: "bounced", label: "Bounced" },
        { value: "deleted", label: "Deleted" },
      ],
    },
    {
      key: "date",
      label: "Entered this state on or after",
      type: "string",
      placeholder: "2026-01-01",
      hint: "YYYY-MM-DD, in the client's timezone. Filters by when the subscriber entered the " +
        "selected state, not by when they joined the list.",
    },
    ...pageParams(100),
    {
      key: "orderField",
      label: "Order by",
      type: "select",
      options: [
        { value: "email", label: "Email address" },
        { value: "name", label: "Name" },
        { value: "date", label: "Date (the API default)" },
      ],
    },
    orderDirectionParam,
    {
      key: "includeTrackingPreference",
      label: "Include tracking consent",
      type: "boolean",
      hint: "Off by default, matching the API. Adds ConsentToTrack to each record.",
    },
    {
      key: "includeSmsPreference",
      label: "Include SMS consent",
      type: "boolean",
      hint:
        "Off by default, matching the API. Adds ConsentToSendSms, and only for subscribers who " +
        "have a mobile number.",
    },
  ],
  output: pagedOutput,

  execute(input, ctx) {
    const state = (input.state ?? "active").toLowerCase();
    if (!(SUBSCRIBER_STATES as readonly string[]).includes(state)) {
      // Guarded rather than passed through: an unknown segment here would build
      // a path that this API answers with a 401, which reads like a rejected
      // key. See lib/client.ts#AUTH_PRECEDES_ROUTING.
      throw new Error(`State must be one of: ${SUBSCRIBER_STATES.join(", ")}`);
    }
    return new CampaignMonitorClient(ctx).json<PagedResult<SubscriberRecord>>(
      `/lists/${encodeId(input.listId)}/${state}`,
      {
        query: {
          date: input.date,
          page: input.page,
          pagesize: input.pageSize,
          orderfield: input.orderField,
          orderdirection: input.orderDirection,
          includetrackingpreference: input.includeTrackingPreference,
          includesmspreference: input.includeSmsPreference,
        },
      },
    );
  },
};

export default listSubscribersGet;
