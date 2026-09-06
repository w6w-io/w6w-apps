import type { ActionDefinition } from "@w6w/types";
import { CapsuleClient } from "../lib/client.ts";

interface Input {
  partyId: number;
  embed?: string[];
}

const partyGet: ActionDefinition<Input> = {
  key: "party-get",
  type: "read",
  resource: "party",
  title: "Get Party",
  description: "Show a specific person or organisation.",
  params: [
    { key: "partyId", label: "Party ID", type: "number", required: true },
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
  output: [{ key: "party", type: "object", label: "Party" }],

  async execute(input, ctx) {
    const { data } = await new CapsuleClient(ctx).request<{ party: unknown }>(
      `/parties/${input.partyId}`,
      { query: { embed: input.embed?.join(",") } },
    );
    return { party: data.party };
  },
};

export default partyGet;
