import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient } from "../lib/client.ts";

/**
 * `GET /api/v3.3/clients.json` — every client in the account. **Account-level.**
 *
 * A "client" is Campaign Monitor's sub-account. An agency has many; a direct
 * customer has exactly one; lists, campaigns, templates, segments, journeys and
 * the suppression list all hang off a client rather than off the account. So
 * this is the entry point for almost everything else in this app: its
 * `ClientID` is the `clientId` param of every client-level action.
 *
 * The response is a bare array of `{ClientID, Name}` and nothing else — notably
 * not the per-client secret that `client-get` returns.
 */
interface ClientSummary {
  ClientID: string;
  Name: string;
}

const clientList: ActionDefinition<Record<string, never>, ClientSummary[]> = {
  key: "client-list",
  type: "search",
  resource: "client",
  title: "List Clients",
  description: "List every client (sub-account) in the account, with its ID and name.",
  params: [],
  output: [
    { key: "ClientID", type: "string", label: "Client ID" },
    { key: "Name", type: "string", label: "Client name" },
  ],

  execute(_input, ctx) {
    return new CampaignMonitorClient(ctx).json<ClientSummary[]>("/clients");
  },
};

export default clientList;
