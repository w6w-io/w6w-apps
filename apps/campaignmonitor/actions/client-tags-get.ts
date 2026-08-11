import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { clientIdParam } from "../lib/params.ts";

/**
 * `GET /api/v3.3/clients/{clientid}/tags.json` — campaign tags for a client.
 * **Client-level.** New in v3.3.
 *
 * Returns `[{Name, NumberOfCampaigns}]` in ascending name order. Worth noting
 * the vendor's own example prints `"NumberOfCampaigns": "120"` — a **string**,
 * not a number — so the output field is typed `string` here rather than
 * asserting a type the published example contradicts.
 *
 * These are the values the `tags` filter of `client-campaigns-get` matches.
 */
interface Input {
  clientId: string;
}

interface ClientTag {
  Name: string;
  NumberOfCampaigns: string;
}

const clientTagsGet: ActionDefinition<Input, ClientTag[]> = {
  key: "client-tags-get",
  type: "search",
  resource: "campaign",
  title: "Get Client Tags",
  description:
    "List a client's campaign tags in ascending order with the number of campaigns carrying each.",
  params: [clientIdParam],
  output: [
    { key: "Name", type: "string", label: "Tag name" },
    {
      key: "NumberOfCampaigns",
      type: "string",
      label: "Campaigns carrying the tag (the vendor returns this as a string)",
    },
  ],

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).json<ClientTag[]>(
      `/clients/${encodeId(input.clientId)}/tags`,
    );
  },
};

export default clientTagsGet;
