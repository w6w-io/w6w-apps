import type { ActionDefinition } from "@w6w/types";
import { BrevoClient } from "../lib/client.ts";

interface Input {
  senderId: string;
}

const deleteSender: ActionDefinition<Input> = {
  key: "delete-sender",
  type: "perform",
  resource: "sender",
  title: "Delete Sender",
  description: "Delete a sender identity by ID.",
  idempotent: true,
  params: [
    { key: "senderId", label: "Sender ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new BrevoClient(ctx);
    await client.request(`/senders/${encodeURIComponent(input.senderId)}`, {
      method: "DELETE",
    });
    return { success: true };
  },
};

export default deleteSender;
