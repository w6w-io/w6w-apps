import type { ActionDefinition } from "@w6w/types";
import { OnfleetClient } from "../lib/client.ts";

/** `GET /recipients/:id` — fetch a recipient by ID. */
const action: ActionDefinition = {
  key: "recipient-get",
  type: "read",
  resource: "recipient",
  title: "Get recipient",
  description: "Fetch a recipient by ID.",
  params: [
    { key: "recipientId", label: "Recipient ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "phone", type: "string", label: "Phone" },
  ],

  async execute(input, ctx) {
    const { recipientId } = input as { recipientId: string };
    if (!recipientId) throw new Error("`recipientId` is required");
    return await new OnfleetClient(ctx).request(`/recipients/${encodeURIComponent(recipientId)}`);
  },
};

export default action;
