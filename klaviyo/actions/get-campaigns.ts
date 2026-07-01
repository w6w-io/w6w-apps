import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface Input {
  filter: string;
  sort?: string;
  pageCursor?: string;
  fieldsCampaign?: string;
  include?: string;
}

/**
 * NOTE: Klaviyo requires a `filter` with a `messages.channel` clause on this
 * endpoint (e.g. `equals(messages.channel,'email')`). We require the param
 * rather than default to email, so multi-channel accounts don't get silently
 * filtered.
 */
const getCampaigns: ActionDefinition<Input, KlaviyoEnvelope<unknown[]>> = {
  key: "get-campaigns",
  type: "read",
  resource: "campaign",
  title: "Get Campaigns",
  description: "List campaigns for a channel. `filter` is required and must include a `messages.channel` clause.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "string",
      required: true,
      default: "equals(messages.channel,'email')",
      hint: 'Must include a `messages.channel` clause, e.g. `equals(messages.channel,\'email\')`.',
    },
    { key: "sort", label: "Sort", type: "string", default: "-send_time" },
    { key: "pageCursor", label: "Page cursor", type: "string" },
    { key: "fieldsCampaign", label: "Campaign fields", type: "string" },
    { key: "include", label: "Include", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    return client.request<KlaviyoEnvelope<unknown[]>>(`/campaigns/`, {
      query: {
        filter: input.filter,
        sort: input.sort ?? "-send_time",
        "page[cursor]": input.pageCursor,
        "fields[campaign]": input.fieldsCampaign,
        include: input.include,
      },
    });
  },
};

export default getCampaigns;
