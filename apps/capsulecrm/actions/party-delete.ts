import type { ActionDefinition } from "@w6w/types";
import { CapsuleClient } from "../lib/client.ts";

interface Input {
  partyId: number;
}

const partyDelete: ActionDefinition<Input> = {
  key: "party-delete",
  type: "perform",
  resource: "party",
  title: "Delete Party",
  description: "Permanently delete a person or organisation from Capsule.",
  idempotent: true,
  params: [
    { key: "partyId", label: "Party ID", type: "number", required: true },
  ],
  output: [
    {
      key: "accepted",
      type: "boolean",
      label: "Deferred (202)",
    },
  ],

  async execute(input, ctx) {
    // Usually `204 No Content`; the docs state Capsule "might schedule the
    // deletion for later" and answer `202 Accepted` (with a Location header
    // pointing at a /jobs/{id} resource) instead. This action does not poll
    // that job — see README.
    const { status } = await new CapsuleClient(ctx).request(`/parties/${input.partyId}`, {
      method: "DELETE",
    });
    return { accepted: status === 202 };
  },
};

export default partyDelete;
