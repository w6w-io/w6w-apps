import type { ActionDefinition } from "@w6w/types";
import { CapsuleClient } from "../lib/client.ts";
import { buildPartyBody, partyFieldParams, type PartyFieldsInput } from "../lib/party.ts";

interface Input extends PartyFieldsInput {
  partyId: number;
  type?: "person" | "organisation";
}

const partyUpdate: ActionDefinition<Input> = {
  key: "party-update",
  type: "perform",
  resource: "party",
  title: "Update Party",
  description: "Change an existing person or organisation. Only the fields you set are touched.",
  idempotent: true,
  params: [
    { key: "partyId", label: "Party ID", type: "number", required: true },
    ...partyFieldParams,
  ],
  output: [{ key: "party", type: "object", label: "Party" }],

  async execute(input, ctx) {
    const { data } = await new CapsuleClient(ctx).request<{ party: unknown }>(
      `/parties/${input.partyId}`,
      { method: "PUT", body: { party: buildPartyBody(input) } },
    );
    return { party: data.party };
  },
};

export default partyUpdate;
