import type { ActionDefinition } from "@w6w/types";
import { CapsuleClient } from "../lib/client.ts";
import { buildPartyBody, partyFieldParams, type PartyFieldsInput } from "../lib/party.ts";

interface Input extends PartyFieldsInput {
  type: "person" | "organisation";
}

const partyCreate: ActionDefinition<Input> = {
  key: "party-create",
  type: "perform",
  resource: "party",
  title: "Create Party",
  description: "Create a new person or organisation.",
  idempotent: false,
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { value: "person", label: "Person" },
        { value: "organisation", label: "Organisation" },
      ],
    },
    ...partyFieldParams,
  ],
  output: [{ key: "party", type: "object", label: "Party" }],

  async execute(input, ctx) {
    const { data } = await new CapsuleClient(ctx).request<{ party: unknown }>("/parties", {
      method: "POST",
      body: { party: buildPartyBody(input) },
    });
    return { party: data.party };
  },
};

export default partyCreate;
