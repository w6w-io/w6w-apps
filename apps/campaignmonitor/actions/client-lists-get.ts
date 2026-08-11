import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { clientIdParam } from "../lib/params.ts";

/**
 * `GET /api/v3.3/clients/{clientid}/lists.json` — the client's subscriber lists.
 * **Client-level.**
 *
 * A bare array of `{ListID, Name}`. This is the practical way to get a `listId`
 * for everything under Lists and Subscribers; the alternative is reading "List
 * API ID" from the bottom of a list's Settings page in the UI.
 */
interface Input {
  clientId: string;
}

interface ListSummary {
  ListID: string;
  Name: string;
}

const clientListsGet: ActionDefinition<Input, ListSummary[]> = {
  key: "client-lists-get",
  type: "search",
  resource: "client",
  title: "Get Client Lists",
  description: "List every subscriber list belonging to a client, with its ID and name.",
  params: [clientIdParam],
  output: [
    { key: "ListID", type: "string", label: "List ID" },
    { key: "Name", type: "string", label: "List name" },
  ],

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).json<ListSummary[]>(
      `/clients/${encodeId(input.clientId)}/lists`,
    );
  },
};

export default clientListsGet;
