import type { ActionDefinition } from "@w6w/types";
import { CapsuleClient } from "../lib/client.ts";
import { type PageInput, pageParams, pageQuery } from "../lib/params.ts";

interface Input extends PageInput {
  since?: string;
  embed?: string[];
}

const OPPORTUNITY_EMBED = [
  { value: "tags", label: "Tags" },
  { value: "fields", label: "Custom fields" },
  { value: "party", label: "Assigned party" },
  { value: "milestone", label: "Milestone" },
  { value: "missingImportantFields", label: "Missing important fields flag" },
];

const opportunityList: ActionDefinition<Input> = {
  key: "opportunity-list",
  type: "read",
  resource: "opportunity",
  title: "List Opportunities",
  description: "List the opportunities (deals) on the Capsule account.",
  params: [
    {
      key: "since",
      label: "Changed since",
      type: "datetime",
      hint: "ISO 8601. Only include opportunities changed after this date.",
    },
    ...pageParams,
    {
      key: "embed",
      label: "Embed",
      type: "multiselect",
      advanced: true,
      options: OPPORTUNITY_EMBED,
    },
  ],
  output: [
    { key: "opportunities", type: "array", label: "Opportunities" },
    { key: "nextPage", type: "number", label: "Next page" },
  ],

  async execute(input, ctx) {
    const { data, nextPage } = await new CapsuleClient(ctx).request<
      { opportunities: unknown[] }
    >("/opportunities", {
      query: { ...pageQuery(input), since: input.since, embed: input.embed?.join(",") },
    });
    return { opportunities: data.opportunities, nextPage };
  },
};

export default opportunityList;
