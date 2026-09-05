import type { ActionDefinition } from "@w6w/types";
import { SenderClient } from "../lib/client.ts";

/** `DELETE /v2/subscribers/{id}/remove_phone` — removes the phone number from a subscriber. */
interface Input {
  id: string;
}

const subscriberRemovePhone: ActionDefinition<Input> = {
  key: "subscriber-remove-phone",
  type: "perform",
  resource: "subscriber",
  title: "Remove Subscriber Phone",
  description: "Remove the phone number from a specific subscriber.",
  idempotent: true,
  params: [{ key: "id", label: "Subscriber ID", type: "string", required: true }],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(
      `/subscribers/${encodeURIComponent(input.id)}/remove_phone`,
      { method: "DELETE", body: {} },
    );
  },
};

export default subscriberRemovePhone;
