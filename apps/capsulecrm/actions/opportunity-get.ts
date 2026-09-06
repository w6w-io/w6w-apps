import type { ActionDefinition } from "@w6w/types";
import { CapsuleClient } from "../lib/client.ts";

interface Input {
  opportunityId: number;
  embed?: string[];
}

const opportunityGet: ActionDefinition<Input> = {
  key: "opportunity-get",
  type: "read",
  resource: "opportunity",
  title: "Get Opportunity",
  description: "Show a specific opportunity.",
  params: [
    { key: "opportunityId", label: "Opportunity ID", type: "number", required: true },
    {
      key: "embed",
      label: "Embed",
      type: "multiselect",
      advanced: true,
      options: [
        { value: "tags", label: "Tags" },
        { value: "fields", label: "Custom fields" },
        { value: "party", label: "Assigned party" },
        { value: "milestone", label: "Milestone" },
        { value: "missingImportantFields", label: "Missing important fields flag" },
      ],
    },
  ],
  output: [{ key: "opportunity", type: "object", label: "Opportunity" }],

  async execute(input, ctx) {
    const { data } = await new CapsuleClient(ctx).request<{ opportunity: unknown }>(
      `/opportunities/${input.opportunityId}`,
      { query: { embed: input.embed?.join(",") } },
    );
    return { opportunity: data.opportunity };
  },
};

export default opportunityGet;
