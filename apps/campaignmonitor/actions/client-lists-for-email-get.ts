import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { clientIdParam, emailParam } from "../lib/params.ts";

/**
 * `GET /api/v3.3/clients/{clientid}/listsforemail.json?email={email}` — every
 * list across the client to which one address is subscribed. **Client-level.**
 *
 * This is the "where is this person?" query, and it is the only one that spans
 * lists in a single call. Each entry carries `SubscriberState` — `Active`,
 * `Unconfirmed`, `Unsubscribed`, `Bounced` or `Deleted` — so an address that
 * appears here is not necessarily *subscribed*; it is *known*.
 *
 * The email goes in the query string, so it is URL-encoded here rather than
 * interpolated raw: a `+` in an address is a legal local-part character and
 * would otherwise be read as a space.
 */
interface Input {
  clientId: string;
  email: string;
}

interface ListForEmail {
  ListID: string;
  ListName: string;
  SubscriberState: string;
  DateSubscriberAdded: string;
}

const clientListsForEmailGet: ActionDefinition<Input, ListForEmail[]> = {
  key: "client-lists-for-email-get",
  type: "search",
  resource: "client",
  title: "Get Lists For Email Address",
  description:
    "Find every list across a client that knows an email address, with the subscriber's state on " +
    "each and the date they were added.",
  params: [clientIdParam, { ...emailParam, label: "Email address to look up" }],
  output: [
    { key: "ListID", type: "string", label: "List ID" },
    { key: "ListName", type: "string", label: "List name" },
    {
      key: "SubscriberState",
      type: "string",
      label: "Active | Unconfirmed | Unsubscribed | Bounced | Deleted",
    },
    { key: "DateSubscriberAdded", type: "string", label: "When they were added, client timezone" },
  ],

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).json<ListForEmail[]>(
      `/clients/${encodeId(input.clientId)}/listsforemail`,
      { query: { email: input.email } },
    );
  },
};

export default clientListsForEmailGet;
