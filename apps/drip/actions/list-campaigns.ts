import type { ActionDefinition } from "@w6w/types";
import { DripClient } from "../lib/client.ts";

interface Input {
  status?: string;
  sort?: string;
  direction?: string;
}

const listCampaigns: ActionDefinition<Input> = {
  key: "list-campaigns",
  type: "read",
  resource: "campaign",
  title: "List Email Series Campaigns",
  description: "List this account's Email Series Campaigns (Drip's automations).",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "All (default)", value: "all" },
        { label: "Draft", value: "draft" },
        { label: "Active", value: "active" },
        { label: "Paused", value: "paused" },
      ],
    },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      advanced: true,
      options: [
        { label: "Created at (default)", value: "created_at" },
        { label: "Name", value: "name" },
      ],
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      advanced: true,
      options: [
        { label: "Ascending (default)", value: "asc" },
        { label: "Descending", value: "desc" },
      ],
    },
  ],
  output: [{ key: "campaigns", type: "array", label: "Campaigns" }],

  async execute(input, ctx) {
    const body = await new DripClient(ctx).request<{ campaigns?: Array<Record<string, unknown>> }>(
      "/campaigns",
      { query: { status: input.status, sort: input.sort, direction: input.direction } },
    );
    return { campaigns: body.campaigns ?? [] };
  },
};

export default listCampaigns;
