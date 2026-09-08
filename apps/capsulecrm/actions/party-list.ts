import type { ActionDefinition } from "@w6w/types";
import { CapsuleClient } from "../lib/client.ts";
import { type PageInput, pageParams, pageQuery } from "../lib/params.ts";

interface Input extends PageInput {
  since?: string;
  embed?: string[];
}

const partyList: ActionDefinition<Input> = {
  key: "party-list",
  type: "read",
  resource: "party",
  title: "List Parties",
  description: "List the people and organisations on the Capsule account.",
  params: [
    {
      key: "since",
      label: "Changed since",
      type: "datetime",
      hint: "ISO 8601. Only include parties changed after this date.",
    },
    ...pageParams,
    {
      key: "embed",
      label: "Embed",
      type: "multiselect",
      advanced: true,
      options: [
        { value: "tags", label: "Tags" },
        { value: "fields", label: "Custom fields" },
        { value: "organisation", label: "Extended organisation details" },
        { value: "missingImportantFields", label: "Missing important fields flag" },
      ],
      hint: "Extra data Capsule omits by default.",
    },
  ],
  output: [
    { key: "parties", type: "array", label: "Parties" },
    { key: "nextPage", type: "number", label: "Next page" },
  ],

  async execute(input, ctx) {
    const { data, nextPage } = await new CapsuleClient(ctx).request<{ parties: unknown[] }>(
      "/parties",
      { query: { ...pageQuery(input), since: input.since, embed: input.embed?.join(",") } },
    );
    return { parties: data.parties, nextPage };
  },
};

export default partyList;
